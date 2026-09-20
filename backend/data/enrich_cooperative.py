"""
FraudX AI — Synthetic Cooperative-Society Enrichment Pipeline
Adds clearly identified synthetic cooperative society context to IBM AMLSim transactions.

IMPORTANT: All fields marked [SYNTHETIC] below are generated values to model
a rural/semi-urban credit cooperative society in India.
They do NOT represent real banking records.
"""
import random
from datetime import datetime, timedelta, date
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd

INDIAN_CITIES = [
    {"city": "Mumbai", "state": "Maharashtra", "lat": 19.0760, "lng": 72.8777},
    {"city": "Pune", "state": "Maharashtra", "lat": 18.5204, "lng": 73.8567},
    {"city": "Nagpur", "state": "Maharashtra", "lat": 21.1458, "lng": 79.0882},
    {"city": "Chennai", "state": "Tamil Nadu", "lat": 13.0827, "lng": 80.2707},
    {"city": "Coimbatore", "state": "Tamil Nadu", "lat": 11.0168, "lng": 76.9558},
    {"city": "Madurai", "state": "Tamil Nadu", "lat": 9.9252, "lng": 78.1198},
    {"city": "Bengaluru", "state": "Karnataka", "lat": 12.9716, "lng": 77.5946},
    {"city": "Mysuru", "state": "Karnataka", "lat": 12.2958, "lng": 76.6394},
    {"city": "Hyderabad", "state": "Telangana", "lat": 17.3850, "lng": 78.4867},
    {"city": "Warangal", "state": "Telangana", "lat": 17.9689, "lng": 79.5941},
    {"city": "Delhi", "state": "Delhi", "lat": 28.7041, "lng": 77.1025},
    {"city": "Ahmedabad", "state": "Gujarat", "lat": 23.0225, "lng": 72.5714},
    {"city": "Surat", "state": "Gujarat", "lat": 21.1702, "lng": 72.8311},
    {"city": "Jaipur", "state": "Rajasthan", "lat": 26.9124, "lng": 75.7873},
    {"city": "Lucknow", "state": "Uttar Pradesh", "lat": 26.8467, "lng": 80.9462},
    {"city": "Kochi", "state": "Kerala", "lat": 9.9312, "lng": 76.2673},
]

FIRST_NAMES = [
    "Aarav", "Aditi", "Ananya", "Arjun", "Deepak", "Divya", "Ganesh", "Gayatri",
    "Harish", "Ishaan", "Kavita", "Kiran", "Lakshmi", "Manish", "Meera", "Mukesh",
    "Naveen", "Neha", "Nikhil", "Pooja", "Pranav", "Priya", "Rahul", "Rajesh",
    "Ravi", "Riya", "Rohan", "Sanjay", "Saravanan", "Shreya", "Siddharth", "Sneha",
    "Suresh", "Swati", "Tarun", "Varun", "Venkatesh", "Vidya", "Vikram", "Vimal",
]

LAST_NAMES = [
    "Sharma", "Patel", "Reddy", "Iyer", "Kumar", "Singh", "Nair", "Rao",
    "Joshi", "Deshmukh", "Pillai", "Verma", "Gupta", "Kulkarni", "Mehta", "Bhat",
    "Menon", "Chauhan", "Sundaram", "Murthy",
]

BANKS = [
    "Apex Cooperative Bank", "State Cooperative Agriculture Bank",
    "District Central Cooperative Bank", "Kisan Rural Credit Society",
    "Sahakari Urban Bank", "Pragati Grameen Bank",
]

PURPOSES = [
    "Agricultural Crop Loan EMI",
    "Dairy Cooperative Milk Payout",
    "Fertilizer & Seed Procurement",
    "Member Share Capital Dividend",
    "Tractor Equipment Finance",
    "Micro-Savings Recurring Deposit",
    "Emergency Healthcare Advance",
    "Solar Pump Subsidy Disbursal",
    "Self-Help Group (SHG) Pool Contribution",
]

CHANNEL_TYPES = ["UPI", "IMPS", "NEFT", "RTGS", "Branch Cashier", "Micro-ATM"]


def enrich_amlsim_dataset(
    amlsim_df: pd.DataFrame,
    start_date: datetime = datetime(2026, 9, 14, 0, 0, 0),
    seed: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Enriches AMLSim transactions with synthetic cooperative-society member identities,
    Indian geography with GPS coordinates, financial institutions, and purpose tags.
    """
    random.seed(seed)
    np.random.seed(seed)

    # Collect all unique account IDs from AMLSim
    all_acc_ids = sorted(list(set(amlsim_df["nameOrig"].tolist() + amlsim_df["nameDest"].tolist())))

    # 1. Create Members Dictionary
    members_data = []
    member_map: Dict[str, Dict] = {}

    for idx, acc_id in enumerate(all_acc_ids):
        mbr_id = f"MBR-{400001 + idx}"
        first = FIRST_NAMES[idx % len(FIRST_NAMES)]
        last = LAST_NAMES[(idx * 7) % len(LAST_NAMES)]
        name = f"{first} {last}"
        loc = INDIAN_CITIES[idx % len(INDIAN_CITIES)]

        # Jitter coordinates slightly for realistic clustering
        lat = loc["lat"] + round(random.uniform(-0.04, 0.04), 4)
        lng = loc["lng"] + round(random.uniform(-0.04, 0.04), 4)

        bank = BANKS[idx % len(BANKS)]
        acc_num = f"ACC-{random.randint(1000000000, 9999999999)}"
        join_days = random.randint(100, 1500)
        join_d = (start_date - timedelta(days=join_days)).date()

        share_cap = round(float(random.choice([2500, 5000, 10000, 25000, 50000])), 2)
        sav_bal = round(float(np.random.gamma(shape=3.0, scale=18000.0)), 2)
        loan_out = round(float(random.choice([0, 0, 15000, 45000, 120000, 280000])), 2)

        m_dict = {
            "id": idx + 1,
            "member_id": mbr_id,
            "amlsim_account_id": acc_id,
            "name": name,
            "email": f"{first.lower()}.{last.lower()}{random.randint(10, 99)}@coopnet.org",
            "phone": f"+91 {random.randint(70000, 99999)}{random.randint(10000, 99999)}",
            "city": loc["city"],
            "state": loc["state"],
            "lat": lat,
            "lng": lng,
            "bank": bank,
            "account_id": acc_num,
            "account_type": "Savings" if idx % 4 != 0 else "Credit Current",
            "join_date": join_d,
            "verified": True,
            "share_capital": share_cap,
            "savings_balance": sav_bal,
            "loan_outstanding": loan_out,
            "risk_status": "Low",
        }
        members_data.append(m_dict)
        member_map[acc_id] = m_dict

    members_df = pd.DataFrame(members_data)

    # 2. Enrich Transactions DataFrame
    enriched_txns = []
    for idx, row in amlsim_df.iterrows():
        txn_id = f"TXN-{100001 + idx}"
        orig_acc = row["nameOrig"]
        dest_acc = row["nameDest"]

        sender_m = member_map.get(orig_acc, members_data[0])
        receiver_m = member_map.get(dest_acc, members_data[1 if len(members_data) > 1 else 0])

        step = int(row["step"])
        txn_time = start_date + timedelta(minutes=(step * 15) + random.randint(0, 14))

        # Map channel type
        aml_t = row["type"]
        if aml_t == "PAYMENT":
            c_type = random.choice(["UPI", "Micro-ATM"])
        elif aml_t == "TRANSFER":
            c_type = random.choice(["UPI", "IMPS", "NEFT", "RTGS"])
        else:
            c_type = "Branch Cashier"

        # Device context
        device = "Mobile - Android (CoopPay App)" if c_type in ["UPI", "IMPS"] else "Branch Terminal POS"

        purpose = random.choice(PURPOSES)
        loan_ref = f"LON-{random.randint(10000, 99999)}" if "Loan" in purpose else None

        enriched_txns.append({
            "id": idx + 1,
            "transaction_id": txn_id,
            "amlsim_step": step,
            "amlsim_type": aml_t,
            "amount": float(row["amount"]),
            "old_balance_orig": float(row["oldbalanceOrg"]),
            "new_balance_orig": float(row["newbalanceOrig"]),
            "old_balance_dest": float(row["oldbalanceDest"]),
            "new_balance_dest": float(row["newbalanceDest"]),
            "is_fraud_label": bool(row["isFraud"]),
            "is_flagged_fraud": bool(row["isFlaggedFraud"]),
            "sender_id": sender_m["id"],
            "receiver_id": receiver_m["id"],
            "sender_member_id": sender_m["member_id"],
            "sender_name": sender_m["name"],
            "sender_account_id": sender_m["account_id"],
            "sender_bank": sender_m["bank"],
            "sender_city": sender_m["city"],
            "sender_savings_balance": sender_m["savings_balance"],
            "receiver_member_id": receiver_m["member_id"],
            "receiver_name": receiver_m["name"],
            "receiver_account_id": receiver_m["account_id"],
            "receiver_bank": receiver_m["bank"],
            "receiver_city": receiver_m["city"],
            "transaction_type": c_type,
            "device": device,
            "location_city": sender_m["city"],
            "location_state": sender_m["state"],
            "lat": sender_m["lat"],
            "lng": sender_m["lng"],
            "purpose": purpose,
            "loan_ref": loan_ref,
            "timestamp": txn_time,
            "status": "Flagged" if row["isFraud"] else "Completed",
        })

    txns_df = pd.DataFrame(enriched_txns)
    return members_df, txns_df
