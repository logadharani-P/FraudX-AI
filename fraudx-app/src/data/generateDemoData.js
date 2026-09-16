// Pre-generate demo transaction data from the CSV using Node.js
// Run: node src/data/generateDemoData.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read and parse CSV
const csvPath = path.resolve(__dirname, '../../../Dataset/creditcard.csv');
console.log('Reading CSV from:', csvPath);
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.trim().split('\n');
const headers = lines[0].replace(/"/g, '').split(',');

console.log(`Parsing ${lines.length - 1} rows...`);

const allRows = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].replace(/"/g, '').split(',');
  const row = {};
  headers.forEach((h, idx) => { row[h] = values[idx]; });
  allRows.push(row);
}

// Select subset: all fraud + sampled legitimate
const fraudRows = allRows.filter(r => r.Class === '1');
const legitRows = allRows.filter(r => r.Class === '0');

console.log(`Total: ${allRows.length}, Fraud: ${fraudRows.length}, Legit: ${legitRows.length}`);

const step = Math.floor(legitRows.length / 508);
const selectedLegit = [];
for (let i = 0; i < legitRows.length && selectedLegit.length < 508; i += step) {
  selectedLegit.push(legitRows[i]);
}

const subset = [...fraudRows, ...selectedLegit];
console.log(`Selected subset: ${subset.length} rows`);

// Write as JSON (only keep needed fields)
const output = subset.map(r => ({
  Time: r.Time,
  V1: r.V1,
  V2: r.V2, 
  V3: r.V3,
  Amount: r.Amount,
  Class: r.Class,
}));

const outputPath = path.resolve(__dirname, 'demoTransactions.json');
fs.writeFileSync(outputPath, JSON.stringify(output));
console.log(`Written ${output.length} records to demoTransactions.json`);
console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
