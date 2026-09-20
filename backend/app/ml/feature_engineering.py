"""
FraudX AI — Feature Engineering for Anomaly Detection
Extracts behavioral, velocity, amount, and network features from transactions.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple


def extract_features(df: pd.DataFrame) -> Tuple[np.ndarray, List[str]]:
    """
    Extracts numerical feature vectors from transaction DataFrame for ML scoring.
    Features:
    1. log_amount: Log-transformed transaction amount
    2. amount_to_savings_ratio: Amount compared to sender savings balance
    3. balance_delta_orig: (old_balance - new_balance) / (amount + 1e-5)
    4. balance_delta_dest: (new_balance - old_balance) / (amount + 1e-5)
    5. sender_txn_count: Total transaction frequency for sender
    6. sender_avg_amount_ratio: Amount / (sender historical mean amount + 1.0)
    7. receiver_degree: In-degree / counterparty popularity
    8. step_velocity: Short-window transaction burst count
    9. is_rapid_movement: Flag for immediate full-balance drain
    10. type_encoded: Numerical encoding of transaction channel/type
    """
    df = df.copy()

    # 1. Log Amount
    df["log_amount"] = np.log1p(df["amount"].clip(lower=0))

    # 2. Savings ratio (synthetic cooperative context)
    savings = df["sender_savings_balance"].fillna(10000.0)
    df["amount_to_savings_ratio"] = (df["amount"] / (savings + 1.0)).clip(upper=20.0)

    # 3. Balance delta orig consistency
    orig_diff = df["old_balance_orig"] - df["new_balance_orig"]
    df["balance_delta_orig_ratio"] = (orig_diff / (df["amount"] + 1.0)).clip(-5.0, 5.0)

    # 4. Balance delta dest consistency
    dest_diff = df["new_balance_dest"] - df["old_balance_dest"]
    df["balance_delta_dest_ratio"] = (dest_diff / (df["amount"] + 1.0)).clip(-5.0, 5.0)

    # 5. Sender frequency & mean ratio
    sender_stats = df.groupby("sender_id")["amount"].agg(["count", "mean"]).reset_index()
    sender_stats.columns = ["sender_id", "sender_txn_count", "sender_mean_amount"]
    df = df.merge(sender_stats, on="sender_id", how="left")
    df["sender_avg_amount_ratio"] = (df["amount"] / (df["sender_mean_amount"] + 1.0)).clip(upper=50.0)

    # 6. Receiver in-degree
    receiver_counts = df.groupby("receiver_id")["amount"].count().reset_index()
    receiver_counts.columns = ["receiver_id", "receiver_in_degree"]
    df = df.merge(receiver_counts, on="receiver_id", how="left")
    df["receiver_in_degree"] = df["receiver_in_degree"].fillna(1)

    # 7. Velocity (txns within ±2 steps)
    df["step_velocity"] = df.groupby(["sender_id", "amlsim_step"])["amount"].transform("count")

    # 8. Rapid balance drain
    df["is_rapid_movement"] = ((df["new_balance_orig"] < 100) & (df["old_balance_orig"] > 5000)).astype(float)

    # 9. Transaction type encoding
    type_map = {"TRANSFER": 1.0, "CASH_OUT": 2.0, "PAYMENT": 0.5, "DEBIT": 0.8, "CASH_IN": 0.3}
    df["amlsim_type_code"] = df["amlsim_type"].map(type_map).fillna(1.0)

    feature_cols = [
        "log_amount",
        "amount_to_savings_ratio",
        "balance_delta_orig_ratio",
        "balance_delta_dest_ratio",
        "sender_txn_count",
        "sender_avg_amount_ratio",
        "receiver_in_degree",
        "step_velocity",
        "is_rapid_movement",
        "amlsim_type_code",
    ]

    X = df[feature_cols].fillna(0.0).values
    return X, feature_cols
