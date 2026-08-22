const { retrieve } = require('./src/rag');
const samples = [
  'my mobile app keeps freezing',
  'my debit card was declined',
  'my account is locked',
  'how much does CloudDesk cost',
  'how do I contact support',
  'I cannot login to my account',
  'how do I export customer data to csv',
];

for (const q of samples) {
  const r = retrieve(q, { topK: 3 });
  console.log(`${q} => ${r[0].entry.id} | ${r.map(x => x.entry.id).join(',')}`);
}
