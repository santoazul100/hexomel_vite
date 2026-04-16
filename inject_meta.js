import fs from 'fs';
import path from 'path';

const dir = 'frontend';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
const metaTag = '<meta name="view-transition" content="same-origin" />';

files.forEach(f => {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');
  if (!content.includes('view-transition')) {
    content = content.replace('</head>', `    ${metaTag}\n  </head>`);
    fs.writeFileSync(fp, content);
    console.log('Updated ' + f);
  }
});
