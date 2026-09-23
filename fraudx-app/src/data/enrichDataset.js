/* ============================================================
   FRAUDX AI — Dataset Ingestion & Processing Layer
   
   Directly parses and serves records from:
   Dataset/fraudx_transactions.csv
   
   Maintains authentic fields: transaction_id, amlsim_step,
   amlsim_type, amount, balances, fraud labels, member IDs,
   types, devices, GPS coordinates, purposes, loan refs,
   Isolation Forest risk scores, and anomaly factors.
   ============================================================ */

// Indian cities with real GPS coordinates (aligned with dataset locations)
export const INDIAN_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { city: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { city: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198 },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { city: 'Warangal', state: 'Telangana', lat: 17.9689, lng: 79.5941 },
  { city: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { city: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { city: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
];

export const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Ananya', 'Arjun', 'Deepak', 'Divya', 'Ganesh', 'Gayatri',
  'Harish', 'Ishaan', 'Kavita', 'Kiran', 'Lakshmi', 'Manish', 'Meera', 'Mukesh',
  'Naveen', 'Neha', 'Nikhil', 'Pooja', 'Pranav', 'Priya', 'Rahul', 'Rajesh',
  'Ravi', 'Riya', 'Rohan', 'Sanjay', 'Saravanan', 'Shreya', 'Siddharth', 'Sneha',
  'Suresh', 'Swati', 'Tarun', 'Varun', 'Venkatesh', 'Vidya', 'Vikram', 'Vimal',
];

export const LAST_NAMES = [
  'Sharma', 'Patel', 'Reddy', 'Iyer', 'Kumar', 'Singh', 'Nair', 'Rao',
  'Joshi', 'Deshmukh', 'Pillai', 'Verma', 'Gupta', 'Kulkarni', 'Mehta', 'Bhat',
  'Menon', 'Chauhan', 'Sundaram', 'Murthy',
];

export const BANKS = [
  'Apex Cooperative Bank',
  'State Cooperative Agriculture Bank',
  'District Central Cooperative Bank',
  'Kisan Rural Credit Society',
  'Sahakari Urban Bank',
  'Pragati Grameen Bank',
];

/**
 * Deterministically generates member records corresponding to member IDs 1..223
 * found in fraudx_transactions.csv
 */
export function generateMembers(count = 223) {
  const members = [];
  for (let i = 1; i <= count; i++) {
    const idx = i - 1;
    const first = FIRST_NAMES[idx % FIRST_NAMES.length];
    const last = LAST_NAMES[(idx * 7) % LAST_NAMES.length];
    const loc = INDIAN_CITIES[idx % INDIAN_CITIES.length];
    const bank = BANKS[idx % BANKS.length];

    const seedVal = i * 9301 + 49297;
    const latOffset = (((seedVal % 1000) / 1000) - 0.5) * 0.04;
    const lngOffset = ((((seedVal * 3) % 1000) / 1000) - 0.5) * 0.04;
    const accNumber = `ACC-${1000000000 + ((seedVal * 17) % 9000000000)}`;

    members.push({
      id: i,
      memberId: `MBR-${400000 + i}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}${10 + (idx % 90)}@coopnet.org`,
      phone: `+91 ${70000 + (idx * 137) % 30000} ${10000 + (idx * 251) % 90000}`,
      city: loc.city,
      state: loc.state,
      lat: loc.lat + latOffset,
      lng: loc.lng + lngOffset,
      bank: bank,
      accountId: accNumber,
      accountType: i % 4 !== 0 ? 'Savings' : 'Credit Current',
      joinDate: '14 Sep 2024',
      verified: true,
      shareCapital: [2500, 5000, 10000, 25000, 50000][idx % 5],
      savingsBalance: 15000 + ((idx * 3791) % 85000),
      loanOutstanding: [0, 0, 15000, 45000, 120000, 280000][idx % 6],
      transactions: [],
      totalAmount: 0,
      fraudCount: 0,
      riskStatus: 'Low',
    });
  }
  return members;
}

/**
 * Ingest and enrich records directly from fraudx_transactions.csv
 */
export function enrichDataset(rawRows) {
  if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
    return { transactions: [], members: [], alerts: [], stats: {}, people: [] };
  }

  const members = generateMembers(223);
  const memberMap = new Map();
  members.forEach(m => memberMap.set(m.id, m));

  const transactions = [];

  rawRows.forEach((row, index) => {
    const sId = parseInt(row.sender_id || 1, 10);
    const rId = parseInt(row.receiver_id || 2, 10);
    const sender = memberMap.get(sId) || members[0];
    const receiver = memberMap.get(rId) || members[1];

    const amount = parseFloat(row.amount || 0);
    const isFraud = row.is_fraud_label === '1' || row.is_fraud_label === 1 || row.is_fraud_label === true;
    const isFlaggedFraud = row.is_flagged_fraud === '1' || row.is_flagged_fraud === 1 || row.is_flagged_fraud === true;
    const riskScore = parseFloat(row.risk_score || 0);
    const rawRiskLevel = (row.risk_level || 'low').toLowerCase();
    const riskLevel = rawRiskLevel === 'critical' ? 'Critical' : (rawRiskLevel === 'high' ? 'High' : (rawRiskLevel === 'medium' ? 'Medium' : 'Low'));

    let anomalyFactors = [];
    if (typeof row.anomaly_factors === 'string') {
      try {
        anomalyFactors = JSON.parse(row.anomaly_factors);
      } catch {
        anomalyFactors = row.anomaly_factors ? [row.anomaly_factors] : [];
      }
    } else if (Array.isArray(row.anomaly_factors)) {
      anomalyFactors = row.anomaly_factors;
    }

    const rawStatus = (row.status || 'completed').toLowerCase();
    const status = rawStatus === 'flagged' ? 'Flagged' : (rawStatus === 'blocked' ? 'Blocked' : (rawStatus === 'under review' ? 'Under Review' : (rawStatus === 'monitoring' ? 'Monitoring' : 'Completed')));

    const timestampStr = row.timestamp || '2026-09-14 00:00:00';
    const dateObj = new Date(timestampStr.replace(' ', 'T'));
    const date = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '14 Sep 2026';
    const time = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
      : '12:00:00 AM';
    const dateTime = `${date}, ${time}`;
    const timeSeconds = !isNaN(dateObj.getTime()) ? dateObj.getTime() / 1000 : index * 60;

    const txnId = row.transaction_id || `TXN-${100000 + parseInt(row.id || index + 1, 10)}`;
    const lat = parseFloat(row.lat) || sender.lat;
    const lng = parseFloat(row.lng) || sender.lng;
    const city = row.location_city || sender.city;
    const state = row.location_state || sender.state;

    const txnObj = {
      id: txnId,
      numericId: parseInt(row.id || index + 1, 10),
      transaction_id: txnId,
      originalIndex: index,
      amount: Math.round(amount * 100) / 100,
      amountFormatted: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      oldBalanceOrig: parseFloat(row.old_balance_orig || 0),
      newBalanceOrig: parseFloat(row.new_balance_orig || 0),
      oldBalanceDest: parseFloat(row.old_balance_dest || 0),
      newBalanceDest: parseFloat(row.new_balance_dest || 0),
      isFraud,
      isFlaggedFraud,
      class: isFraud ? 1 : 0,

      senderId: sender.id,
      senderName: sender.name,
      senderMemberId: sender.memberId,
      senderAccountId: sender.accountId,
      senderBank: sender.bank,
      senderCity: sender.city,

      receiverId: receiver.id,
      receiverName: receiver.name,
      receiverMemberId: receiver.memberId,
      receiverAccountId: receiver.accountId,
      receiverBank: receiver.bank,
      receiverCity: receiver.city,

      type: row.transaction_type || 'Transfer',
      amlsimType: row.amlsim_type || 'TRANSFER',
      amlsimStep: parseInt(row.amlsim_step || 1, 10),
      device: row.device || 'Branch Terminal POS',
      purpose: row.purpose || 'Cooperative Transaction',
      loanRef: row.loan_ref || '',

      location: `${city}, ${state}`,
      city: city,
      state: state,
      lat: lat,
      lng: lng,

      riskScore,
      riskLevel,
      anomalyScore: parseFloat(row.anomaly_score || 0),
      anomalyFactors: anomalyFactors.length > 0 ? anomalyFactors : ['Normal transaction parameters consistent with account baseline'],
      status,

      timestamp: timestampStr,
      createdAt: row.created_at || timestampStr,
      dateObj,
      date,
      time,
      dateTime,
      timeSeconds,
    };

    transactions.push(txnObj);

    // Track member transactions
    sender.transactions.push(txnObj.id);
    sender.totalAmount += txnObj.amount;
    if (isFraud) sender.fraudCount++;

    receiver.transactions.push(txnObj.id);
  });

  // Update member risk status
  members.forEach(m => {
    if (m.fraudCount > 0) m.riskStatus = 'High';
    else if (m.transactions.length > 0 && m.totalAmount > 100000) m.riskStatus = 'Medium';
    else m.riskStatus = 'Low';
  });

  // Generate alerts for flagged & high/critical risk transactions from CSV
  const alerts = [];
  let alertIdx = 1;

  transactions.forEach(txn => {
    if (txn.isFraud || txn.riskScore >= 55 || txn.riskLevel === 'High' || txn.riskLevel === 'Critical') {
      const fText = txn.anomalyFactors.join(' ').toLowerCase();
      let category = 'Unusual Amount';
      if (fText.includes('velocity')) category = 'Velocity Anomaly';
      else if (fText.includes('drain') || fText.includes('balance') || fText.includes('rapid')) category = 'Rapid Fund Movement';
      else if (fText.includes('network') || fText.includes('counterparty') || fText.includes('cycle')) category = 'Suspicious Network Pattern';
      else if (fText.includes('location') || fText.includes('geo')) category = 'Location Anomaly';
      else if (fText.includes('device')) category = 'Device Anomaly';

      alerts.push({
        id: `ALT-${200000 + alertIdx}`,
        transactionId: txn.id,
        category,
        riskLevel: txn.riskLevel,
        riskScore: txn.riskScore,
        reason: txn.anomalyFactors[0] || 'AI anomaly assessment flagged transaction',
        description: `AI anomaly assessment flagged transaction ${txn.id} (₹${txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) for review. Score: ${txn.riskScore.toFixed(1)}/100.`,
        timestamp: txn.dateTime,
        date: txn.date,
        time: txn.time,
        status: txn.riskLevel === 'Critical' ? 'Open' : (txn.isFraud ? 'Open' : 'Investigating'),
        amount: txn.amount,
        senderName: txn.senderName,
        receiverName: txn.receiverName,
      });
      alertIdx++;
    }
  });

  // Stats calculation directly from all records
  const stats = {
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    fraudCount: transactions.filter(t => t.isFraud).length,
    legitimateCount: transactions.filter(t => !t.isFraud).length,
    avgAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / (transactions.length || 1),
    maxAmount: transactions.length > 0 ? Math.max(...transactions.map(t => t.amount)) : 0,
    highRiskCount: transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length,
    mediumRiskCount: transactions.filter(t => t.riskLevel === 'Medium').length,
    lowRiskCount: transactions.filter(t => t.riskLevel === 'Low').length,
    criticalAlerts: alerts.filter(a => a.riskLevel === 'Critical').length,
    openAlerts: alerts.filter(a => a.status === 'Open').length,
    typeCounts: {},
    cityCounts: {},
    fraudRate: '0.00',
  };

  transactions.forEach(t => {
    stats.typeCounts[t.type] = (stats.typeCounts[t.type] || 0) + 1;
    if (t.city) stats.cityCounts[t.city] = (stats.cityCounts[t.city] || 0) + 1;
  });

  stats.fraudRate = stats.totalTransactions > 0 ? ((stats.fraudCount / stats.totalTransactions) * 100).toFixed(2) : '0.00';

  return {
    transactions,
    members,
    alerts,
    stats,
    people: members,
  };
}

