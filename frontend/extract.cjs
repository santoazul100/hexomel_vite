const fs = require('fs');
const path = require('path');
const dir = './';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
const res = {};
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const regex = /data-i18n=["']([^"']+)["'][^>]*>([^<]+)</g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    let key = match[1];
    let val = match[2].trim();
    if(val) res[key] = val;
  }
  const regex2 = /data-i18n-ph=["']([^"']+)["'][^>]*placeholder=["']([^"']+)["']/g;
  while ((match = regex2.exec(content)) !== null) {
    res[match[1]] = match[2].trim();
  }
});
const existing = fs.readFileSync('src/i18n.js', 'utf8');
let missing = {};
for (let k in res) {
  if (!existing.includes('"' + k + '":') && !existing.includes("'" + k + "':")) {
    missing[k] = res[k];
  }
}
fs.writeFileSync('missing_keys.json', JSON.stringify(missing, null, 2));