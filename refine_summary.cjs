const fs = require('fs');

try {
  let css = fs.readFileSync('c:/escola/pap/code/hexomel_vite/frontend/src/styles/checkout.css', 'utf8');

  // 1. Update .order-summary-card
  // Remove gold top border, change bg to white, simplify others
  css = css.replace(/\.order-summary-card \{[\s\S]*?\}/, `.order-summary-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 35px;
  position: sticky;
  top: 110px;
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.04);
  border: 1px solid #eef0ed;
}`);

  // 2. Update .summary-title
  css = css.replace(/\.summary-title \{[\s\S]*?\}/, `.summary-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 30px;
  color: var(--primary-green);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eef0ed;
}`);

  // 3. Remove .summary-title::after
  css = css.replace(/\.summary-title::after \{[\s\S]*?\}/, `.summary-title::after {
  display: none;
}`);

  // 4. Update .summary-total-section
  css = css.replace(/\.summary-total-section \{[\s\S]*?\}/, `.summary-total-section {
  margin-top: 25px;
  padding: 24px;
  background: #fcfdfc;
  border-radius: 16px;
  border: 1px solid #eef0ed;
}`);

  fs.writeFileSync('c:/escola/pap/code/hexomel_vite/frontend/src/styles/checkout.css', css);
  console.log("Order summary refined successfully.");
} catch (err) {
  console.error(err);
}
