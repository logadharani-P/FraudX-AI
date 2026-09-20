"""
FraudX AI — Pure NumPy Isolation Forest Anomaly Detection Engine
Implements the Liu et al. (2008) Isolation Forest algorithm using pure NumPy.
Requires zero external C DLLs. Computes anomaly scores, calibrated risk scores (0–100),
explainable reasons, and genuine evaluation metrics on synthetic AMLSim benchmark labels.
"""
import math
import pickle
import os
from typing import Dict, List, Tuple, Any, Optional
import numpy as np
import pandas as pd

from app.ml.feature_engineering import extract_features
from app.ml.risk_explainer import explain_transaction_risk


def _c(n: int) -> float:
    """Average path length of unsuccessful search in BST."""
    if n <= 1:
        return 0.0
    if n == 2:
        return 1.0
    euler_mascheroni = 0.5772156649
    return 2.0 * (math.log(n - 1) + euler_mascheroni) - (2.0 * (n - 1) / n)


class _iTreeNode:
    def __init__(
        self,
        left: Optional["_iTreeNode"] = None,
        right: Optional["_iTreeNode"] = None,
        split_feature: Optional[int] = None,
        split_value: Optional[float] = None,
        size: int = 0,
        is_leaf: bool = False,
    ):
        self.left = left
        self.right = right
        self.split_feature = split_feature
        self.split_value = split_value
        self.size = size
        self.is_leaf = is_leaf


class _iTree:
    def __init__(self, max_depth: int, rng: np.random.Generator):
        self.max_depth = max_depth
        self.rng = rng
        self.root: Optional[_iTreeNode] = None

    def fit(self, X: np.ndarray) -> "_iTree":
        self.root = self._build_tree(X, current_depth=0)
        return self

    def _build_tree(self, X: np.ndarray, current_depth: int) -> _iTreeNode:
        n_samples, n_features = X.shape
        if current_depth >= self.max_depth or n_samples <= 1:
            return _iTreeNode(size=n_samples, is_leaf=True)

        # Check if all samples are identical
        mins = X.min(axis=0)
        maxs = X.max(axis=0)
        valid_features = np.where(maxs > mins)[0]
        if len(valid_features) == 0:
            return _iTreeNode(size=n_samples, is_leaf=True)

        # Randomly select a valid feature
        q = int(self.rng.choice(valid_features))
        p = float(self.rng.uniform(mins[q], maxs[q]))

        left_mask = X[:, q] < p
        right_mask = ~left_mask

        if left_mask.sum() == 0 or right_mask.sum() == 0:
            return _iTreeNode(size=n_samples, is_leaf=True)

        left_node = self._build_tree(X[left_mask], current_depth + 1)
        right_node = self._build_tree(X[right_mask], current_depth + 1)

        return _iTreeNode(
            left=left_node,
            right=right_node,
            split_feature=q,
            split_value=p,
            size=n_samples,
            is_leaf=False,
        )

    def path_length(self, x: np.ndarray) -> float:
        return self._compute_path_length(x, self.root, 0)

    def _compute_path_length(self, x: np.ndarray, node: _iTreeNode, current_depth: int) -> float:
        if node.is_leaf:
            return current_depth + _c(node.size)
        if x[node.split_feature] < node.split_value:
            return self._compute_path_length(x, node.left, current_depth + 1)
        else:
            return self._compute_path_length(x, node.right, current_depth + 1)


class PureNumPyIsolationForest:
    def __init__(
        self,
        n_estimators: int = 100,
        max_samples: int = 256,
        random_state: int = 42,
    ):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.random_state = random_state
        self.rng = np.random.default_rng(random_state)
        self.trees: List[_iTree] = []
        self.subsample_size = 256

    def fit(self, X: np.ndarray) -> "PureNumPyIsolationForest":
        n_samples = X.shape[0]
        self.subsample_size = min(self.max_samples, n_samples)
        max_depth = int(math.ceil(math.log2(max(self.subsample_size, 2))))

        self.trees = []
        for _ in range(self.n_estimators):
            sample_indices = self.rng.choice(n_samples, size=self.subsample_size, replace=False)
            X_sample = X[sample_indices]
            tree = _iTree(max_depth=max_depth, rng=self.rng)
            tree.fit(X_sample)
            self.trees.append(tree)

        return self

    def score_samples(self, X: np.ndarray) -> np.ndarray:
        """
        Computes anomaly score for each sample in X.
        Score s(x, n) = 2^(-E(h(x)) / c(psi))
        s in [0, 1]. s -> 1 means anomalous, s < 0.5 means normal.
        """
        n_samples = X.shape[0]
        paths = np.zeros((n_samples, self.n_estimators))

        for t_idx, tree in enumerate(self.trees):
            for i in range(n_samples):
                paths[i, t_idx] = tree.path_length(X[i])

        mean_paths = paths.mean(axis=1)
        c_factor = _c(self.subsample_size)
        if c_factor == 0:
            return np.full(n_samples, 0.5)

        scores = 2.0 ** (-mean_paths / c_factor)
        return scores


class RiskScoringEngine:
    def __init__(self, contamination: float = 0.05, random_state: int = 42):
        self.contamination = contamination
        self.random_state = random_state
        self.model = PureNumPyIsolationForest(
            n_estimators=100,
            max_samples=256,
            random_state=self.random_state,
        )
        self.feature_names: List[str] = []
        self.is_fitted = False
        self.evaluation_metrics: Dict[str, Any] = {}

    def fit_and_score(self, df: pd.DataFrame) -> pd.DataFrame:
        X, self.feature_names = extract_features(df)
        self.model.fit(X)
        self.is_fitted = True

        raw_scores = self.model.score_samples(X)  # Scores in [0, 1]

        # Min-max scale to 0-100 calibrated risk score
        min_s, max_s = raw_scores.min(), raw_scores.max()
        if max_s > min_s:
            norm_scores = ((raw_scores - min_s) / (max_s - min_s)) * 100.0
        else:
            norm_scores = raw_scores * 100.0

        df = df.copy()
        df["anomaly_score"] = raw_scores
        df["risk_score"] = np.round(norm_scores, 1)

        def to_risk_level(score: float) -> str:
            if score >= 80.0:
                return "Critical"
            elif score >= 60.0:
                return "High"
            elif score >= 35.0:
                return "Medium"
            return "Low"

        df["risk_level"] = df["risk_score"].apply(to_risk_level)

        # Generate explainable reasons
        reasons_list = []
        for _, row in df.iterrows():
            r_dict = row.to_dict()
            reasons = explain_transaction_risk(r_dict, row["risk_score"])
            reasons_list.append(reasons)
        df["anomaly_factors"] = reasons_list

        # True benchmark evaluation metrics on known synthetic AMLSim labels
        if "is_fraud_label" in df.columns:
            y_true = df["is_fraud_label"].astype(int).values
            y_pred = (df["risk_score"] >= 60.0).astype(int).values

            tp = int(((y_true == 1) & (y_pred == 1)).sum())
            fp = int(((y_true == 0) & (y_pred == 1)).sum())
            fn = int(((y_true == 1) & (y_pred == 0)).sum())
            tn = int(((y_true == 0) & (y_pred == 0)).sum())

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0

            self.evaluation_metrics = {
                "precision": round(float(precision), 4),
                "recall": round(float(recall), 4),
                "f1_score": round(float(f1), 4),
                "false_positive_rate": round(float(fpr), 4),
                "true_positives": tp,
                "false_positives": fp,
                "true_negatives": tn,
                "false_negatives": fn,
                "total_evaluated": len(df),
                "benchmark_source": "IBM AMLSim Ground Truth Typologies",
            }

        return df

    def save_model(self, path: str):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump({
                "model": self.model,
                "metrics": self.evaluation_metrics,
                "features": self.feature_names,
            }, f)
