const fs = require('fs');
const content = fs.readFileSync('frontend/src/skeleton.js', 'utf8');

// Find the content between return ` and `; inside workshopCard()
const match = content.match(/workshopCard\(\) \{\s*return `([\s\S]*?)`;/);
if (!match) {
  console.error("Could not find workshopCard HTML");
  process.exit(1);
}

const cardHtml = match[1];

let html = '';
for (let i = 0; i < 6; i++) {
  html += '          <div class="col-md-6 col-lg-4">\n      ' + cardHtml + '\n          </div>\n';
}

const antiFlickerScript = `
        </div>
        <script>
          // Anti-Flicker para Skeletons: se o estilo em cache for spinner, limpa os skeletons hardcoded para evitar FOUC
          try {
            if (localStorage.getItem('hexomel_skeleton_style') === 'spinner') {
              document.getElementById('workshops-grid').innerHTML = '<div class="skeleton-spinner-container" style="grid-column: 1 / -1; width: 100%; min-height: 200px;"><div class="skeleton-spinner-circle"></div><p class="skeleton-spinner-text">A carregar...</p></div>';
            }
          } catch(e) {}
        </script>`;

let workshopsHtml = fs.readFileSync('frontend/workshops.html', 'utf8');
workshopsHtml = workshopsHtml.replace(
  /<div class="row g-4" id="workshops-grid">[\s\S]*?<\/div>/, 
  '<div class="row g-4" id="workshops-grid">\n' + html + antiFlickerScript
);

// Also fix the title to match CMS translation
workshopsHtml = workshopsHtml.replace(
  '<h1 class="workshops-hero-title display-4 fw-bold" style="color: var(--primary-green)">Workshops</h1>',
  '<h1 class="workshops-hero-title display-4 fw-bold" style="color: var(--primary-green)">Workshops de Apicultura</h1>'
);

fs.writeFileSync('frontend/workshops.html', workshopsHtml);
console.log('Successfully injected skeleton HTML and anti-flicker script into workshops.html');
