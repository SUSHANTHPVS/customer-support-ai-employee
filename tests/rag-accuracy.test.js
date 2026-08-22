const assert = require('node:assert/strict');
const { retrieve } = require('../src/rag');

const cases = [
  ['my mobile app keeps freezing', 'tech-01'],
  ['my app is freezing on my iphone', 'tech-01'],
  ['my debit card was declined', 'bill-04'],
  ['I cannot login to my account', 'acct-01'],
  ['team member invite', 'acct-03'],
  ['how do I export customer data to csv', 'tech-04'],
  ['where is my data stored', 'gen-03'],
  ['how much does CloudDesk cost', 'gen-01'],
  ['how do I contact support', 'gen-02'],
  ['I need to delete my account', 'acct-06'],
  ['i have 429 rate limit errors', 'tech-06'],
  ['how do I download my invoice', 'bill-06'],
];

for (const [query, expectedId] of cases) {
  const results = retrieve(query, { topK: 3 });
  const actualId = results[0]?.entry?.id ?? null;
  assert.equal(actualId, expectedId, `Expected "${query}" to resolve to ${expectedId}, got ${actualId ?? 'none'} (${JSON.stringify(results.map(r => r.entry.id))})`);
}

console.log(`RAG accuracy checks passed: ${cases.length} scenarios verified.`);
