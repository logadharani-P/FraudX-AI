// Pre-generate demo transaction data from Dataset/fraudx_transactions.csv using Node.js
// Run: node src/data/generateDemoData.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple robust CSV parser handling quotes and escaped quotes
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  function parseLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current);
    return fields;
  }

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }

  return rows;
}

// Read and parse Dataset/fraudx_transactions.csv
const csvPath = path.resolve(__dirname, '../../../Dataset/fraudx_transactions.csv');
console.log('Reading active dataset CSV from:', csvPath);
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const allRows = parseCSV(csvContent);
console.log(`Parsed all ${allRows.length} transaction records from fraudx_transactions.csv`);

const outputPath = path.resolve(__dirname, 'demoTransactions.json');
fs.writeFileSync(outputPath, JSON.stringify(allRows, null, 2));
console.log(`Written ${allRows.length} records to demoTransactions.json`);
console.log(`File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

