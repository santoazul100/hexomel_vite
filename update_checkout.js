const fs = require('fs');

try {
  let html = fs.readFileSync('c:/escola/pap/code/hexomel_vite/frontend/checkout.html', 'utf8');

  const stepperRegex = /<div class="worten-step active" id="step-1">[\s\S]*?<div class="worten-step" id="step-5">[\s\S]*?<\/span>\s*<\/div>/;
  html = html.replace(stepperRegex, `<div class="worten-step active" id="step-1">
            <div class="worten-step-circle">1</div>
            <span class="worten-step-label">Dados de Envio</span>
          </div>
          <div class="worten-step" id="step-2">
            <div class="worten-step-circle">2</div>
            <span class="worten-step-label">Pagamento e Revisão</span>
          </div>`);

  const formContentRegex = /<!-- Step 1 Content: Faturação -->[\s\S]*?<!-- Step 5 Content: Revisão -->[\s\S]*?<\/button>\s*<\/div>\s*<\/div>/;

  const newFormContent = `<!-- Step 1 Content: Dados e Entrega -->
              <div id="step-content-1">
                <h5 style="font-weight: 700; margin-bottom: 15px;">1. Identificação</h5>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div class="worten-form-group">
                    <input type="text" id="nome" class="worten-input" placeholder=" " required />
                    <label class="worten-label">Nome</label>
                  </div>
                  <div class="worten-form-group">
                    <input type="text" id="apelido" class="worten-input" placeholder=" " />
                    <label class="worten-label">Apelido</label>
                  </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div class="worten-form-group">
                    <input type="text" id="nif" class="worten-input" placeholder=" " />
                    <label class="worten-label">NIF (opcional)</label>
                  </div>
                  <div class="worten-form-group">
                    <input type="tel" id="telemovel" class="worten-input" placeholder=" " required />
                    <label class="worten-label">Telemóvel</label>
                  </div>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;">

                <h5 style="font-weight: 700; margin-bottom: 15px;">2. Morada de Entrega</h5>
                <div class="worten-form-group">
                  <input type="text" id="morada" class="worten-input" placeholder=" " required />
                  <label class="worten-label">Morada completa</label>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 20px;">
                  <div class="worten-form-group">
                    <input type="text" id="cod-postal" class="worten-input" placeholder=" " required />
                    <label class="worten-label">Código postal</label>
                  </div>
                  <div class="worten-form-group">
                    <input type="text" id="cidade" class="worten-input" placeholder=" " required />
                    <label class="worten-label">Cidade</label>
                  </div>
                </div>

                <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 20px 0;">

                <h5 style="font-weight: 700; margin-bottom: 15px;">3. Método de Envio</h5>
                <div class="selection-card selected mb-3">
                  <label style="display: flex; align-items: center; gap: 15px; cursor: pointer;">
                    <input type="radio" name="envio" value="ctt" checked style="accent-color: var(--primary-gold); width: 22px; height: 22px;" />
                    <div style="flex: 1">
                      <div style="font-weight: 700">CTT Expresso</div>
                      <div style="font-size: 0.85rem; color: var(--text-medium)">Entrega em casa (2-3 dias úteis)</div>
                    </div>
                    <div style="font-weight: 700; color: var(--primary-gold-dark)">€4.90</div>
                  </label>
                </div>
                <div class="selection-card">
                  <label style="display: flex; align-items: center; gap: 15px; cursor: pointer;">
                    <input type="radio" name="envio" value="loja" style="accent-color: var(--primary-gold); width: 22px; height: 22px;" />
                    <div style="flex: 1">
                      <div style="font-weight: 700">Levantamento no Apiário</div>
                      <div style="font-size: 0.85rem; color: var(--text-medium)">Disponível imediatamente (Grátis)</div>
                    </div>
                    <div style="font-weight: 700; color: var(--success-color)">Grátis</div>
                  </label>
                </div>

                <div class="d-flex justify-content-end mt-4">
                  <button type="button" class="btn-worten-primary m-0" onclick="window.checkoutManager.nextStep()">
                    Continuar para Pagamento
                  </button>
                </div>
              </div>

              <!-- Step 2 Content: Pagamento e Revisão -->
              <div id="step-content-2" class="d-none">
                <h5 style="font-weight: 700; margin-bottom: 15px;">Opções de Pagamento</h5>
                <div class="selection-card selected mb-3">
                  <label style="display: flex; align-items: center; gap: 15px; cursor: pointer;">
                    <input type="radio" name="pagamento" value="cartao" checked style="accent-color: var(--primary-gold); width: 22px; height: 22px;" />
                    <i class="fas fa-credit-card" style="font-size: 1.2rem; color: var(--text-medium)"></i>
                    <div style="flex: 1">
                      <div style="font-weight: 700">Cartão de Crédito / Débito</div>
                      <div style="font-size: 0.85rem; color: var(--text-medium)">Processamento seguro via STRIPE</div>
                    </div>
                  </label>
                </div>
                <div class="selection-card mb-4">
                  <label style="display: flex; align-items: center; gap: 15px; cursor: pointer;">
                    <input type="radio" name="pagamento" value="mbway" style="accent-color: var(--primary-gold); width: 22px; height: 22px;" />
                    <i class="fas fa-mobile-alt" style="font-size: 1.2rem; color: var(--text-medium)"></i>
                    <div style="flex: 1">
                      <div style="font-weight: 700">MB Way</div>
                      <div style="font-size: 0.85rem; color: var(--text-medium)">Pagamento instantâneo no telemóvel</div>
                    </div>
                  </label>
                </div>

                <div class="checkout-card" style="padding: 20px; border: 1px dashed var(--border-color); background: var(--off-white); margin-bottom: 20px;">
                  <h6 style="font-weight: 700; margin-bottom: 8px;">Confirmação de Envio</h6>
                  <p id="review-morada" style="margin: 0; font-size: 0.95rem; color: var(--text-medium);"></p>
                  <p id="review-contacto" style="margin: 0; font-size: 0.95rem; color: var(--text-medium);"></p>
                </div>

                <div class="d-flex gap-3 justify-content-end mt-4">
                  <button type="button" class="btn-worten-secondary m-0" onclick="window.checkoutManager.prevStep()">
                    Voltar
                  </button>
                  <button type="submit" class="btn-worten-primary m-0" id="final-submit-btn">
                    Finalizar e Pagar
                  </button>
                </div>`;

  html = html.replace(formContentRegex, newFormContent);
  fs.writeFileSync('c:/escola/pap/code/hexomel_vite/frontend/checkout.html', html);
  console.log("Success");
} catch(err){
  console.error(err);
}
