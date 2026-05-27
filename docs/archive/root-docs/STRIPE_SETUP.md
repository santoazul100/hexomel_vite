# Configuração do Stripe - Hexomel 🐝

Para ativares os pagamentos reais (ou em modo de teste oficial) no teu projeto, segue estes passos simples:

## 1. Criar Conta Stripe
1. Vai a [Stripe.com](https://stripe.com) e cria uma conta gratuita.
2. Não precisas de ativar a conta com dados bancários reais para usar o **Modo de Teste**.

## 2. Obter as Chaves de API
1. No painel da Stripe, ativa o interruptor **"Test Mode"** (Modo de teste) no topo direito.
2. Vai a **Developers** > **API Keys**.
3. Copia a **Publishable key** (começa por `pk_test_...`).
4. Revela e copia a **Secret key** (começa por `sk_test_...`).

## 3. Configurar o Projeto
Abre o teu ficheiro `backend/.env` e adiciona as chaves:

```env
STRIPE_PUBLISHABLE_KEY=pk_test_tua_chave_aqui
STRIPE_SECRET_KEY=sk_test_tua_chave_aqui
```

## 4. Webhooks (Opcional para Local)
Para que o site saiba AUTOMATICAMENTE quando o pagamento foi feito:
1. Instala o [Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Corre o comando: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
3. Copia o **Webhook Secret** (`whsec_...`) que o comando te der para o `.env`:
   `STRIPE_WEBHOOK_SECRET=whsec_...`

## 5. Fazer as Imagens Aparecerem (Localhost)
A Stripe não consegue ver imagens que estão no teu `localhost`. Se quiseres ver as imagens REAIS dos teus produtos no Checkout:
1. Usa o **Ngrok** para criar um túnel público.
2. Adiciona esta variável ao teu `backend/.env`:
   `CHECKOUT_PUBLIC_BASE_URL=https://teu-subdominio-ngrok.ngrok-free.app`
3. Substitui o URL acima pelo URL que o Ngrok te der.

## 6. Configurar o Logótipo do Site
Para que o logótipo da Hexomel e o nome apareçam no topo da página de pagamento:
1. Vai ao Dashboard da Stripe > **Settings** > **Branding**.
2. Carrega o teu **Icon** e **Logo**.
3. Define as **Brand colors**.
4. Clica em **Save changes**.
5. No Checkout Session, o nome que aparece é o **Public business name** definido em **Settings** > **Account details**.

---
**Nota:** Enquanto não definires estas chaves, o projeto funcionará em **MOCK MODE** (Simulação), permitindo-te testar tudo sem precisar destas chaves!
