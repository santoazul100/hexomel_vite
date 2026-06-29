const fs = require('fs');

function processFile(filePath, prefix) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let dictPT = {};
  let dictEN = {};
  let counter = 1;

  // We can write regexes to replace specific patterns.
  // But regex on HTML is tricky. Let's do it semi-manually or by specific strings.
}
