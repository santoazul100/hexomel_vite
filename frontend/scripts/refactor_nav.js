import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDir = path.resolve(__dirname, '..');
const files = fs.readdirSync(frontendDir).filter(f => f.endsWith('.html'));

const replacement = '<div id="navbar-container"></div>';

for (const file of files) {
  const filePath = path.join(frontendDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // The regex searches for <nav> containing "navbar" up to </nav>
  const regex = /<nav class="navbar[^>]*>[\s\S]*?<\/nav>/g;
  
  if (regex.test(content)) {
    content = content.replace(regex, replacement);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
