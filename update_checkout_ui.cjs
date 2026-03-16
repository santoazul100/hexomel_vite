const fs = require('fs');
try {
  let css = fs.readFileSync('c:/escola/pap/code/hexomel_vite/frontend/src/styles/checkout.css', 'utf8');

  // Enhance variables to match premium look
  css = css.replace(/--radius-lg: 1\.2rem;/g, '--radius-lg: 1.5rem;');
  css = css.replace(/--shadow-sm: 0 4px 6px rgba\(0, 0, 0, 0\.04\);/g, '--shadow-sm: 0 20px 40px rgba(0, 0, 0, 0.03);');
  css = css.replace(/--bg-light: #fdfdfd;/g, '--bg-light: #fefdf0;');

  // Enhance checkout card
  const checkoutCardRegex = /\.checkout-card \{\s*background: rgba\(255, 255, 255, 0\.8\);\s*backdrop-filter: var\(--glass-blur\);\s*border-radius: var\(--radius-lg\);\s*padding: 40px;\s*box-shadow: var\(--shadow-sm\);\s*margin-bottom: 25px;\s*border: 1px solid rgba\(255, 255, 255, 0\.6\);\s*transition: transform var\(--transition\);\s*\}/;
  css = css.replace(checkoutCardRegex, `.checkout-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 45px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.03);
  margin-bottom: 30px;
  border: 1px solid rgba(0, 0, 0, 0.03);
  transition: var(--transition);
}`);

  // Form Inputs Premium
  const inputRegex = /\.worten-input \{\s*width: 100%;\s*padding: 24px 18px 10px;\s*border: 2px solid var\(--border-color\);\s*border-radius: var\(--radius-md\);\s*font-size: 1rem;\s*background: var\(--off-white\);\s*transition: var\(--transition\);\s*font-family: var\(--font-body\);\s*color: var\(--text-dark\);\s*\}/;
  css = css.replace(inputRegex, `.worten-input {
  width: 100%;
  padding: 26px 20px 12px;
  border: 2px solid #eef0ed;
  border-radius: 12px;
  font-size: 1.05rem;
  background: #fcfdfc;
  transition: all 0.3s ease;
  font-family: var(--font-body);
  color: var(--text-dark);
}`);

  // Stepper premium
  const stepperCircleRegex = /\.worten-step-circle \{\s*width: 38px;\s*height: 38px;\s*border-radius: 50%;\s*border: 2px solid var\(--border-color\);\s*display: flex;\s*align-items: center;\s*justify-content: center;\s*background: white;\s*margin-bottom: 10px;\s*font-weight: 600;\s*color: var\(--text-light\);\s*transition: var\(--transition\);\s*font-family: var\(--font-body\);\s*\}/;
  css = css.replace(stepperCircleRegex, `.worten-step-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid #eef0ed;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  margin-bottom: 12px;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--text-light);
  transition: var(--transition);
  font-family: var(--font-body);
  box-shadow: 0 4px 10px rgba(0,0,0,0.02);
}`);

  const activeStepperCircleRegex = /\.worten-step\.active \.worten-step-circle \{\s*border-color: var\(--primary-gold\);\s*color: var\(--primary-gold\);\s*background: var\(--cream\);\s*box-shadow: 0 0 0 5px rgba\(244, 180, 0, 0\.1\);\s*transform: scale\(1\.1\);\s*\}/;
  css = css.replace(activeStepperCircleRegex, `.worten-step.active .worten-step-circle {
  border-color: var(--primary-green);
  color: white;
  background: var(--primary-green);
  box-shadow: 0 8px 20px rgba(26, 77, 46, 0.2);
  transform: scale(1.15);
}`);

  const stepperLineRegex = /\.worten-stepper::before \{\s*content: "";\s*position: absolute;\s*top: 18px;\s*left: 10%;\s*right: 10%;\s*height: 2px;\s*background: var\(--border-color\);\s*z-index: 1;\s*\}/;
  css = css.replace(stepperLineRegex, `.worten-stepper::before {
  content: "";
  position: absolute;
  top: 22px;
  left: 15%;
  right: 15%;
  height: 2px;
  background: #eef0ed;
  z-index: 1;
}`);

const selectionCardRegex = /\.selection-card \{\s*padding: 20px;\s*border: 2px solid var\(--border-color\);\s*border-radius: var\(--radius-md\);\s*background: var\(--white\);\s*transition: var\(--transition\);\s*cursor: pointer;\s*margin-bottom: 15px;\s*\}/;
css = css.replace(selectionCardRegex, `.selection-card {
  padding: 22px;
  border: 2px solid #eef0ed;
  border-radius: 16px;
  background: white;
  transition: var(--transition);
  cursor: pointer;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
}`);

const selectionCardActiveRegex = /\.selection-card\.selected \{\s*border-color: var\(--primary-gold\);\s*background: rgba\(244, 180, 0, 0\.05\);\s*\}/;
css = css.replace(selectionCardActiveRegex, `.selection-card.selected {
  border-color: var(--primary-green);
  background: rgba(26, 77, 46, 0.03);
  box-shadow: 0 5px 15px rgba(26, 77, 46, 0.05);
}`);

  fs.writeFileSync('c:/escola/pap/code/hexomel_vite/frontend/src/styles/checkout.css', css);
  
  let html = fs.readFileSync('c:/escola/pap/code/hexomel_vite/frontend/checkout.html', 'utf8');

  // Title fix
  html = html.replace(/<h1 class="checkout-title" id="page-title">Dados de Faturação<\/h1>/, `<h1 class="checkout-title" id="page-title" style="color: var(--primary-green); letter-spacing: -0.5px; font-weight: 800;">Dados de Faturação</h1>`);

  // Button fixes to match modern.css
  html = html.replace(/<button type="button" class="btn-worten-primary" onclick="window\.checkoutManager\.nextStep\(\)">/g, `<button type="button" class="btn-worten-primary" style="border-radius: 50px; text-transform: uppercase; font-size: 0.95rem; letter-spacing: 1px;" onclick="window.checkoutManager.nextStep()">`);
  html = html.replace(/<button type="submit" class="btn-worten-primary" style="margin-top: 0" id="final-submit-btn">/g, `<button type="submit" class="btn-worten-primary" style="margin-top: 0; border-radius: 50px; text-transform: uppercase; font-size: 0.95rem; letter-spacing: 1px;" id="final-submit-btn">`);
  html = html.replace(/<button type="button" class="btn-worten-secondary" onclick="window\.checkoutManager\.prevStep\(\)">/g, `<button type="button" class="btn-worten-secondary" style="border-radius: 50px; text-transform: uppercase; font-size: 0.95rem; letter-spacing: 1px;" onclick="window.checkoutManager.prevStep()">`);

  // Accent Colors for selection boxes
  html = html.replace(/accent-color: var\(--primary-gold\)/g, 'accent-color: var(--primary-green)');

  fs.writeFileSync('c:/escola/pap/code/hexomel_vite/frontend/checkout.html', html);
  console.log("update ui success");
} catch(err) {
  console.error(err);
}
