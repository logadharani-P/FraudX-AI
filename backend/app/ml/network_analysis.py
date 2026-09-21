"""
FraudX AI — Graph and Network Analysis Engine (NetworkX)
Analyzes transaction flows, counterparties, cycles, fan-in/fan-out patterns,
and produces localized subgraphs for member investigation.
"""
from typing import Dict, List, Any, Optional
import networkx as nx
import pandas as pd


class TransactionNetworkAnalyzer:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_graph_from_dataframe(self, df: pd.DataFrame) -> nx.DiGraph:
        """
        Builds directed multi-edge / aggregated DiGraph from transaction DataFrame.
        """
        self.graph.clear()

        for _, row in df.iterrows():
            sender = str(row.get("sender_member_id") or row.get("sender_id"))
            receiver = str(row.get("receiver_member_id") or row.get("receiver_id"))
            amount = float(row.get("amount", 0))
            risk_score = float(row.get("risk_score", 0))
            txn_id = str(row.get("transaction_id", ""))

            # Add nodes with metadata
            if not self.graph.has_node(sender):
                self.graph.add_node(
                    sender,
                    label=str(row.get("sender_name", sender)),
                    city=str(row.get("sender_city", row.get("location_city", ""))),
                    risk_level=str(row.get("risk_level", "Low")),
                    node_type="member",
                )
            if not self.graph.has_node(receiver):
                self.graph.add_node(
                    receiver,
                    label=str(row.get("receiver_name", receiver)),
                    city=str(row.get("receiver_city", row.get("location_city", ""))),
                    risk_level="Low",
                    node_type="member",
                )

            # Add or update edge
            if self.graph.has_edge(sender, receiver):
                self.graph[sender][receiver]["amount"] += amount
                self.graph[sender][receiver]["count"] += 1
                self.graph[sender][receiver]["risk_score"] = max(
                    self.graph[sender][receiver]["risk_score"], risk_score
                )
            else:
                self.graph.add_edge(
                    sender,
                    receiver,
                    amount=amount,
                    count=1,
                    risk_score=risk_score,
                    txn_id=txn_id,
                )

        return self.graph

    def get_member_subgraph(
        self, member_id: str, depth: int = 2, max_nodes: int = 30
    ) -> Dict[str, Any]:
        """
        Extracts an ego-network for a specific member up to `depth` hops.
        Returns serialized nodes, edges, topology stats, and detected graph patterns.
        """
        if not self.graph.has_node(member_id):
            return {
                "nodes": [],
                "edges": [],
                "stats": {"density": 0, "total_nodes": 0, "total_edges": 0},
                "suspicious_patterns": ["Member not found in current network graph."],
            }

        # Extract ego network
        sub_nodes = set([member_id])
        current_layer = set([member_id])

        for _ in range(depth):
            next_layer = set()
            for node in current_layer:
                if self.graph.has_node(node):
                    neighbors = set(self.graph.predecessors(node)) | set(self.graph.successors(node))
                    next_layer.update(neighbors)
            sub_nodes.update(next_layer)
            current_layer = next_layer
            if len(sub_nodes) >= max_nodes:
                break

        subgraph = self.graph.subgraph(list(sub_nodes)[:max_nodes]).copy()

        # Detect patterns
        patterns = []
        in_degree = self.graph.in_degree(member_id)
        out_degree = self.graph.out_degree(member_id)

        # Fan-in (aggregation / smurfing)
        if in_degree >= 4:
            patterns.append(f"Fan-In Aggregation: {in_degree} distinct counterparties funneling funds into account")

        # Fan-out (dispersion / layering)
        if out_degree >= 4:
            patterns.append(f"Fan-Out Dispersion: Funds rapidly distributed to {out_degree} distinct beneficiaries")

        # Simple cycles in subgraph
        try:
            cycles = list(nx.simple_cycles(subgraph))
            member_cycles = [c for c in cycles if member_id in c]
            if member_cycles:
                patterns.append(f"Circular Fund Movement: {len(member_cycles)} closed circular routing cycle(s) detected")
        except Exception:
            pass

        # High flow concentration
        total_in_flow = sum(d["amount"] for _, _, d in self.graph.in_edges(member_id, data=True))
        total_out_flow = sum(d["amount"] for _, _, d in self.graph.out_edges(member_id, data=True))
        if total_in_flow > 0 and abs(total_in_flow - total_out_flow) / (total_in_flow + 1) < 0.05 and total_in_flow > 50000:
            patterns.append("Pass-Through Account: Outbound volume nearly matches inbound volume within short window")

        # Format nodes and edges for JSON response
        nodes = []
        for n, d in subgraph.nodes(data=True):
            nodes.append({
                "id": str(n),
                "label": d.get("label", str(n)),
                "type": "target_member" if n == member_id else d.get("node_type", "member"),
                "risk_level": d.get("risk_level", "Low"),
                "city": d.get("city", ""),
                "account_id": str(n),
            })

        edges = []
        for u, v, d in subgraph.edges(data=True):
            edges.append({
                "source": str(u),
                "target": str(v),
                "amount": float(d.get("amount", 0)),
                "count": int(d.get("count", 1)),
                "risk_score": float(d.get("risk_score", 0)),
                "type": "HIGH_RISK" if d.get("risk_score", 0) >= 60 else "NORMAL",
            })

        stats = {
            "density": round(float(nx.density(subgraph)), 4) if len(subgraph) > 1 else 0.0,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "in_degree": in_degree,
            "out_degree": out_degree,
            "total_in_flow": round(total_in_flow, 2),
            "total_out_flow": round(total_out_flow, 2),
        }

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": stats,
            "suspicious_patterns": patterns,
        }
