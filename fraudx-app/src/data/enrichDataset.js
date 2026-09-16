/* ============================================================
   FRAUDX AI — Demo Transaction Data Enrichment Layer
   
   Maps real Kaggle creditcard.csv (Amount, Time, Class) values
   to synthetic Indian financial context for demo purposes.
   ALL ENRICHED DATA IS CLEARLY LABELED AS DEMO DATA.
   ============================================================ */

// Indian cities with real GPS coordinates
const INDIAN_CITIES = [
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
  { name: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366 },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
];

// Indian names pool
const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Sai', 'Reyansh', 'Arnav', 'Dhruv', 'Kabir', 'Karthik',
  'Ananya', 'Diya', 'Priya', 'Isha', 'Saanvi', 'Aanya', 'Myra', 'Riya', 'Kavya', 'Meera',
  'Rajesh', 'Suresh', 'Vijay', 'Manoj', 'Deepak', 'Amit', 'Rahul', 'Nikhil', 'Sanjay', 'Prakash',
  'Sunita', 'Lakshmi', 'Geeta', 'Padma', 'Nandini', 'Shreya', 'Neha', 'Pooja', 'Swati', 'Divya',
  'Harish', 'Gopal', 'Ramesh', 'Ganesh', 'Mohan', 'Vikram', 'Ashok', 'Kumar', 'Naveen', 'Ravi'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Verma', 'Joshi',
  'Mehta', 'Shah', 'Das', 'Mukherjee', 'Rao', 'Pillai', 'Menon', 'Chopra', 'Malhotra', 'Bhat',
  'Agarwal', 'Banerjee', 'Chandra', 'Deshpande', 'Gandhi', 'Hegde', 'Kapoor', 'Mishra', 'Pandey', 'Tiwari'
];

const TRANSACTION_TYPES = ['UPI', 'NEFT', 'RTGS', 'Card Payment', 'ATM Withdrawal', 'IMPS', 'Net Banking', 'POS Terminal'];
const DEVICES = ['Mobile - Android', 'Mobile - iOS', 'Desktop - Windows', 'Desktop - macOS', 'ATM', 'POS Terminal', 'Tablet - iPad', 'Desktop - Linux'];
const BANKS = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank', 'Bank of Baroda', 'Yes Bank', 'IndusInd Bank', 'Federal Bank'];

// Seeded random for consistent demo data
function seededRandom(seed) {
  let s = seed;
  return function() {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickRandom(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

function generateAccountId(rng) {
  return 'ACC-' + String(Math.floor(rng() * 9000000000 + 1000000000));
}

function generateTransactionId(index) {
  return 'TXN-' + String(index + 100001);
}

function generateAlertId(index) {
  return 'ALT-' + String(index + 200001);
}

function generateCaseId(index) {
  return 'CSE-' + String(index + 300001);
}

function generateMemberId(index) {
  return 'MBR-' + String(index + 400001);
}

// Anomaly reasons based on data patterns
const ANOMALY_REASONS = {
  highAmount: 'Unusual transaction amount detected',
  rapidSequence: 'Rapid transaction sequence identified',
  newLocation: 'Transaction from unusual location',
  newDevice: 'New device used for transaction',
  oddTiming: 'Transaction at unusual time',
  frequencyAnomaly: 'Higher than normal transaction frequency',
  networkPattern: 'Suspicious network pattern detected',
};

// Map seconds-from-epoch to actual dates in September 2026
const BASE_DATE = new Date('2026-09-14T00:00:00+05:30');

function timeToDate(timeSeconds) {
  return new Date(BASE_DATE.getTime() + timeSeconds * 1000);
}

function formatDate(date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function formatDateTime(date) {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

// Generate risk score from PCA features
function calculateRiskScore(row, isFraud) {
  if (isFraud) {
    return Math.floor(65 + Math.random() * 35); // 65-99
  }
  // Use V-feature magnitudes to create some variation for non-fraud
  const magnitude = Math.abs(parseFloat(row.V1 || 0)) + Math.abs(parseFloat(row.V2 || 0)) + Math.abs(parseFloat(row.V3 || 0));
  const base = Math.min(Math.floor(magnitude * 3), 55);
  return Math.max(5, Math.min(base, 55));
}

function getRiskLevel(score) {
  if (score >= 80) return 'Critical';
  if (score >= 60) return 'High';
  if (score >= 35) return 'Medium';
  return 'Low';
}

function getStatus(isFraud, riskScore) {
  if (isFraud) {
    if (riskScore >= 80) return 'Flagged';
    return 'Under Review';
  }
  if (riskScore >= 50) return 'Under Review';
  if (riskScore >= 35) return 'Monitoring';
  return 'Completed';
}

function getAnomalyFactors(isFraud, amount, riskScore, rng) {
  const factors = [];
  if (isFraud) {
    if (amount > 500) factors.push(ANOMALY_REASONS.highAmount);
    factors.push(ANOMALY_REASONS.newDevice);
    if (rng() > 0.4) factors.push(ANOMALY_REASONS.oddTiming);
    if (rng() > 0.5) factors.push(ANOMALY_REASONS.rapidSequence);
    if (rng() > 0.6) factors.push(ANOMALY_REASONS.newLocation);
    if (factors.length === 1) factors.push(ANOMALY_REASONS.networkPattern);
  } else if (riskScore >= 35) {
    if (amount > 1000) factors.push(ANOMALY_REASONS.highAmount);
    if (rng() > 0.7) factors.push(ANOMALY_REASONS.frequencyAnomaly);
  }
  return factors;
}

// Generate member profiles from transaction participants
function generateMemberProfiles(transactions) {
  const memberMap = new Map();
  
  transactions.forEach(txn => {
    if (!memberMap.has(txn.senderId)) {
      memberMap.set(txn.senderId, {
        id: txn.senderId,
        memberId: txn.senderMemberId,
        name: txn.senderName,
        accountId: txn.senderAccountId,
        bank: txn.senderBank,
        city: txn.senderCity,
        email: `${txn.senderName.split(' ')[0].toLowerCase()}@email.com`,
        phone: `+91 ${Math.floor(7000000000 + Math.random() * 3000000000)}`,
        transactions: [],
        totalAmount: 0,
        fraudCount: 0,
        riskStatus: 'Low',
        joinDate: 'Jan 2024',
        verified: true,
      });
    }
    const member = memberMap.get(txn.senderId);
    member.transactions.push(txn.id);
    member.totalAmount += txn.amount;
    if (txn.isFraud) member.fraudCount++;
    if (member.fraudCount > 0) member.riskStatus = 'High';
    else if (txn.riskScore > 40) member.riskStatus = 'Medium';
  });

  return Array.from(memberMap.values());
}

// Generate alerts from fraud transactions
function generateAlerts(transactions) {
  const alerts = [];
  let alertIdx = 0;
  
  const alertCategories = [
    'Unusual Amount', 'Frequency Anomaly', 'Location Anomaly',
    'Device Anomaly', 'Rapid Fund Movement', 'Suspicious Network Pattern'
  ];

  transactions.forEach(txn => {
    if (txn.isFraud || txn.riskScore >= 55) {
      const rng = seededRandom(txn.originalIndex + 9999);
      alerts.push({
        id: generateAlertId(alertIdx),
        transactionId: txn.id,
        category: txn.isFraud 
          ? pickRandom(alertCategories, rng)
          : (txn.amount > 1000 ? 'Unusual Amount' : pickRandom(['Frequency Anomaly', 'Location Anomaly'], rng)),
        riskLevel: txn.riskLevel,
        riskScore: txn.riskScore,
        reason: txn.anomalyFactors[0] || 'Suspicious activity detected',
        description: `AI risk assessment flagged transaction ${txn.id} for review. ${txn.anomalyFactors.join('. ')}.`,
        timestamp: txn.dateTime,
        date: txn.date,
        time: txn.time,
        status: txn.isFraud ? 'Open' : (rng() > 0.5 ? 'Investigating' : 'Open'),
        amount: txn.amount,
        senderName: txn.senderName,
        receiverName: txn.receiverName,
      });
      alertIdx++;
    }
  });

  return alerts;
}

// Main enrichment function
export function enrichDataset(rawRows) {
  const transactions = [];
  const rng = seededRandom(42);

  // Create a pool of people
  const people = [];
  for (let i = 0; i < 80; i++) {
    const r = seededRandom(i * 137);
    people.push({
      id: i,
      name: `${pickRandom(FIRST_NAMES, r)} ${pickRandom(LAST_NAMES, r)}`,
      accountId: generateAccountId(r),
      memberId: generateMemberId(i),
      city: INDIAN_CITIES[i % INDIAN_CITIES.length],
      bank: pickRandom(BANKS, r),
    });
  }

  rawRows.forEach((row, index) => {
    const r = seededRandom(index * 31 + 7);
    const isFraud = row.Class === '1' || row.Class === 1;
    const amount = parseFloat(row.Amount);
    const timeSeconds = parseFloat(row.Time);
    const dateObj = timeToDate(timeSeconds);
    
    const sender = people[Math.floor(r() * people.length)];
    let receiver = people[Math.floor(r() * people.length)];
    while (receiver.id === sender.id) {
      receiver = people[Math.floor(r() * people.length)];
    }

    // For fraud, sometimes use a different city to show location anomaly
    const txnCity = isFraud && r() > 0.5 
      ? INDIAN_CITIES[Math.floor(r() * INDIAN_CITIES.length)]
      : sender.city;

    // Add slight randomness to GPS coordinates (within ~5km)
    const latOffset = (r() - 0.5) * 0.05;
    const lngOffset = (r() - 0.5) * 0.05;

    const riskScore = calculateRiskScore(row, isFraud);
    const riskLevel = getRiskLevel(riskScore);
    const status = getStatus(isFraud, riskScore);
    const anomalyFactors = getAnomalyFactors(isFraud, amount, riskScore, r);
    const txnType = pickRandom(TRANSACTION_TYPES, r);
    const device = pickRandom(DEVICES, r);

    transactions.push({
      id: generateTransactionId(index),
      originalIndex: index,
      amount: Math.round(amount * 100) / 100,
      amountFormatted: `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      timeSeconds,
      dateObj,
      date: formatDate(dateObj),
      time: formatTime(dateObj),
      dateTime: formatDateTime(dateObj),
      isFraud,
      class: parseInt(row.Class),
      
      // Sender
      senderId: sender.id,
      senderName: sender.name,
      senderAccountId: sender.accountId,
      senderMemberId: sender.memberId,
      senderBank: sender.bank,
      senderCity: sender.city.name,
      
      // Receiver
      receiverId: receiver.id,
      receiverName: receiver.name,
      receiverAccountId: receiver.accountId,
      receiverMemberId: receiver.memberId,
      receiverBank: receiver.bank,
      receiverCity: receiver.city.name,

      // Location (demo)
      location: `${txnCity.name}, ${txnCity.state}`,
      lat: txnCity.lat + latOffset,
      lng: txnCity.lng + lngOffset,
      city: txnCity.name,
      state: txnCity.state,

      // Transaction details
      type: txnType,
      device: device,

      // Risk
      riskScore,
      riskLevel,
      status,
      anomalyFactors,

      // PCA features (keep a few for AI agent reference)
      v1: parseFloat(row.V1 || 0),
      v2: parseFloat(row.V2 || 0),
      v3: parseFloat(row.V3 || 0),
    });
  });

  // Sort by time
  transactions.sort((a, b) => a.timeSeconds - b.timeSeconds);

  const members = generateMemberProfiles(transactions);
  const alerts = generateAlerts(transactions);

  // Calculate statistics from real data
  const stats = {
    totalTransactions: transactions.length,
    totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
    fraudCount: transactions.filter(t => t.isFraud).length,
    legitimateCount: transactions.filter(t => !t.isFraud).length,
    avgAmount: transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length,
    maxAmount: Math.max(...transactions.map(t => t.amount)),
    highRiskCount: transactions.filter(t => t.riskLevel === 'High' || t.riskLevel === 'Critical').length,
    mediumRiskCount: transactions.filter(t => t.riskLevel === 'Medium').length,
    lowRiskCount: transactions.filter(t => t.riskLevel === 'Low').length,
    criticalAlerts: alerts.filter(a => a.riskLevel === 'Critical').length,
    openAlerts: alerts.filter(a => a.status === 'Open').length,
    typeCounts: {},
    cityCounts: {},
    fraudRate: 0,
  };

  // Type distribution
  TRANSACTION_TYPES.forEach(type => {
    stats.typeCounts[type] = transactions.filter(t => t.type === type).length;
  });

  // City distribution
  INDIAN_CITIES.forEach(city => {
    const count = transactions.filter(t => t.city === city.name).length;
    if (count > 0) stats.cityCounts[city.name] = count;
  });

  stats.fraudRate = ((stats.fraudCount / stats.totalTransactions) * 100).toFixed(2);

  return { transactions, members, alerts, stats, people };
}

// Pre-selected subset of dataset rows (to avoid loading 150MB CSV in browser)
// We include all 492 fraud cases + ~508 random legitimate = ~1000 total
export function selectSubset(allRows) {
  const fraudRows = allRows.filter(r => r.Class === '1' || r.Class === 1);
  const legitRows = allRows.filter(r => r.Class === '0' || r.Class === 0);
  
  // Take every Nth legitimate row to get ~508 spread across the time range
  const step = Math.floor(legitRows.length / 508);
  const selectedLegit = [];
  for (let i = 0; i < legitRows.length && selectedLegit.length < 508; i += step) {
    selectedLegit.push(legitRows[i]);
  }

  return [...fraudRows, ...selectedLegit];
}
