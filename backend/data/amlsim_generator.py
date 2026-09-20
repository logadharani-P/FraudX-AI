"""
FraudX AI — IBM AMLSim Benchmark Simulator & Generator
Generates realistic multi-step synthetic transaction simulations matching the
IBM AMLSim schema and typologies (Fan-in, Fan-out, Cycle, Normal Transfers).

AMLSim Source Schema:
- step: int (simulation timestamp interval)
- type: TRANSFER | CASH_IN | CASH_OUT | DEBIT | PAYMENT
- amount: float
- nameOrig: str (Sender Account ID e.g. C10001001)
- oldbalanceOrg: float
- newbalanceOrig: float
- nameDest: str (Receiver Account ID e.g. C10002002 or M30001001)
- oldbalanceDest: float
- newbalanceDest: float
- isFraud: bool / int (1 = known AML pattern, 0 = normal)
- isFlaggedFraud: bool / int (AMLSim simple rule flag)
- modelID: int / str (AMLSim typology model identifier)
"""
import random
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple


def generate_amlsim_dataset(
    num_accounts: int = 120,
    num_transactions: int = 1500,
    fraud_pattern_count: int = 25,
    seed: int = 42,
) -> pd.DataFrame:
    """
    Generates an authentic AMLSim dataset with normal background banking traffic
    interspersed with multi-step AML laundering typologies (fan-in, fan-out, layering cycles).
    """
    random.seed(seed)
    np.random.seed(seed)

    accounts = [f"C{10000000 + i}" for i in range(num_accounts)]
    merchants = [f"M{30000000 + i}" for i in range(15)]
    all_destinations = accounts + merchants

    # Account balances tracking
    balances: Dict[str, float] = {
        acc: round(float(np.random.gamma(shape=5.0, scale=12000.0)), 2) for acc in accounts
    }
    for m in merchants:
        balances[m] = round(float(np.random.uniform(50000, 500000)), 2)

    rows: List[Dict] = []
    current_step = 1

    # 1. Normal Background Transactions
    types_normal = ["TRANSFER", "PAYMENT", "CASH_OUT", "DEBIT", "CASH_IN"]
    weights_normal = [0.45, 0.25, 0.15, 0.10, 0.05]

    for i in range(num_transactions - (fraud_pattern_count * 5)):
        current_step = (i // 15) + 1
        orig = random.choice(accounts)
        txn_type = random.choices(types_normal, weights=weights_normal)[0]

        if txn_type == "PAYMENT":
            dest = random.choice(merchants)
            amount = round(float(np.random.exponential(scale=1800.0) + 100), 2)
        elif txn_type == "CASH_IN":
            dest = orig
            orig = f"C{random.randint(90000000, 99999999)}"
            amount = round(float(np.random.uniform(1000, 25000)), 2)
        else:
            dest = random.choice([a for a in accounts if a != orig])
            amount = round(float(np.random.exponential(scale=6500.0) + 200), 2)

        amount = max(50.0, min(amount, 85000.0))

        old_orig = balances.get(orig, 15000.0)
        new_orig = max(0.0, old_orig - amount if txn_type != "CASH_IN" else old_orig + amount)
        balances[orig] = new_orig

        old_dest = balances.get(dest, 15000.0)
        new_dest = old_dest + amount
        balances[dest] = new_dest

        rows.append({
            "step": current_step,
            "type": txn_type,
            "amount": amount,
            "nameOrig": orig,
            "oldbalanceOrg": round(old_orig, 2),
            "newbalanceOrig": round(new_orig, 2),
            "nameDest": dest,
            "oldbalanceDest": round(old_dest, 2),
            "newbalanceDest": round(new_dest, 2),
            "isFraud": 0,
            "isFlaggedFraud": 0,
            "modelID": 0,
        })

    # 2. Inject AMLSim Multi-Step Typology Patterns
    # Pattern A: Fan-in (Smurfing aggregation into mule account)
    for p in range(fraud_pattern_count // 3):
        mule = random.choice(accounts)
        smurfs = random.sample([a for a in accounts if a != mule], 4)
        step_base = random.randint(10, 80)
        total_smurf_amt = 0.0

        for s_idx, smurf in enumerate(smurfs):
            amt = round(float(np.random.uniform(45000, 95000)), 2)
            total_smurf_amt += amt
            old_s = balances.get(smurf, 100000.0)
            new_s = max(0.0, old_s - amt)
            balances[smurf] = new_s

            old_m = balances.get(mule, 20000.0)
            new_m = old_m + amt
            balances[mule] = new_m

            rows.append({
                "step": step_base + (s_idx % 2),
                "type": "TRANSFER",
                "amount": amt,
                "nameOrig": smurf,
                "oldbalanceOrg": round(old_s, 2),
                "newbalanceOrig": round(new_s, 2),
                "nameDest": mule,
                "oldbalanceDest": round(old_m, 2),
                "newbalanceDest": round(new_m, 2),
                "isFraud": 1,
                "isFlaggedFraud": 1 if amt > 80000 else 0,
                "modelID": 101,  # AMLSim Fan-In Typology
            })

        # Mule drains immediately (rapid dispersion)
        drain_dest = random.choice([a for a in accounts if a not in smurfs and a != mule])
        old_m = balances.get(mule, total_smurf_amt)
        drain_amt = round(old_m * 0.95, 2)
        new_m = old_m - drain_amt
        balances[mule] = new_m
        old_d = balances.get(drain_dest, 10000.0)
        balances[drain_dest] = old_d + drain_amt

        rows.append({
            "step": step_base + 2,
            "type": "TRANSFER",
            "amount": drain_amt,
            "nameOrig": mule,
            "oldbalanceOrg": round(old_m, 2),
            "newbalanceOrig": round(new_m, 2),
            "nameDest": drain_dest,
            "oldbalanceDest": round(old_d, 2),
            "newbalanceDest": round(old_d + drain_amt, 2),
            "isFraud": 1,
            "isFlaggedFraud": 1,
            "modelID": 102,  # AMLSim Layering Drain
        })

    # Pattern B: Circular Layering Cycle (A -> B -> C -> A)
    for p in range(fraud_pattern_count // 3):
        cycle_nodes = random.sample(accounts, 3)
        amt = round(float(np.random.uniform(75000, 220000)), 2)
        step_base = random.randint(15, 85)

        for c_i in range(3):
            src = cycle_nodes[c_i]
            dst = cycle_nodes[(c_i + 1) % 3]
            old_s = balances.get(src, amt + 10000.0)
            new_s = max(0.0, old_s - amt)
            balances[src] = new_s

            old_d = balances.get(dst, 10000.0)
            new_d = old_d + amt
            balances[dst] = new_d

            rows.append({
                "step": step_base + c_i,
                "type": "TRANSFER",
                "amount": amt,
                "nameOrig": src,
                "oldbalanceOrg": round(old_s, 2),
                "newbalanceOrig": round(new_s, 2),
                "nameDest": dst,
                "oldbalanceDest": round(old_d, 2),
                "newbalanceDest": round(new_d, 2),
                "isFraud": 1,
                "isFlaggedFraud": 1 if amt > 150000 else 0,
                "modelID": 201,  # AMLSim Cycle Typology
            })

    # Sort by step
    df = pd.DataFrame(rows).sort_values(by=["step"]).reset_index(drop=True)
    return df
