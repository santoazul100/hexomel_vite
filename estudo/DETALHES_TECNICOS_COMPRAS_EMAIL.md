# Implementação Técnica: Checkout, Encomendas e Emails 🍯

Este documento descreve detalhadamente a arquitetura e a lógica implementada no sistema de compras e comunicações do projeto **Hexomel**.

---

## 🛒 1. Arquitetura do Checkout (Fluxo de Compra)

O processo de checkout foi concebido para ser seguro, intuitivo e rápido, dividido em duas etapas lógicas processadas no cliente (`checkout.js`) e validadas no servidor (`server.js`).

### Etapa 1: Dados de Envio
- **Validação em Tempo Real**: O sistema verifica se todos os campos obrigatórios (nome, telemóvel, morada) estão preenchidos antes de permitir o avanço.
- **Integração de Perfil**: Se o utilizador tiver dados guardados no seu perfil (Morada, Telefone), estes são auto-preenchidos para melhorar a experiência (UX).
- **Seleção de Envio**: O utilizador escolhe entre "CTT Expresso" (com custo) ou "Levantamento" (grátis), atualizando o total imediatamente.

### Etapa 2: Pagamento e Revisão
- **Escolha de Método**: Suporte para Cartão (via Stripe) ou MB Way (manual).
- **Sessão Segura (2FA)**: Antes de chegar ao checkout, o utilizador **tem obrigatoriamente** de verificar a sua sessão através de um código enviado por email, garantindo que a compra é legítima.

---

## 📦 2. Gestão de Encomendas (Base de Dados)

O sistema utiliza um modelo relacional robusto para garantir a integridade dos dados.

### Estrutura de Tabelas
- **`encomenda`**: Armazena o cabeçalho (ID, Cliente, Data, Total, Status, Morada, Telefone).
- **`item_encomenda`**: Armazena os produtos específicos de cada compra, registando o preço unitário da altura (para evitar alterações históricas se o preço do produto mudar no futuro).

### Ciclo de Vida do Estado (Status)
1. **Pendente**: Criada assim que o utilizador clica em "Finalizar", antes da confirmação do pagamento.
2. **Pago**: Atualizado automaticamente após sucesso no Stripe ou confirmação administrativa.
3. **Enviado / Entregue**: Estados geridos pela administração para controlo logístico.

### Botão de Pagamento Recorrente
Implementámos uma funcionalidade no perfil do utilizador: se uma encomenda estiver **Pendente**, o sistema deteta e oferece um botão **"Pagar"** em vez de mostrar o recibo. Isto permite que o utilizador conclua uma compra que foi interrompida sem ter de adicionar tudo ao carrinho novamente.

---

## 📧 3. Sistema de Emails e Integração Google

A comunicação é o ponto vital para a confiança do cliente. Utilizamos o **Nodemailer** para o envio de emails transacionais.

### Configuração com Google/Gmail
Para permitir que o Node.js envie emails através de uma conta Gmail, foram seguidos estes passos de segurança:
1. **2-Step Verification**: Ativada na conta Google (ex: `hexomelpap@gmail.com`).
2. **App Passwords**: Como o Google bloqueia logins diretos de apps "menos seguras", criámos uma **Palavra-passe de Aplicação** de 16 dígitos específica para o Hexomel.
3. **SMTP Transporter**: Configurado no `server.js` utilizando o host `smtp.gmail.com` na porta `587` (TLS).

### Emails Profissionais (Recibos)
- **Logótipo Incorporado (CID)**: Para evitar que o Gmail bloqueie a imagem do logo por segurança, o logo é enviado como um anexo "Inline" através de **Content-ID (CID)**. O email referencia a imagem internamente, garantindo que aparece sempre bem formatado.
- **Templates HTML/CSS**: Os recibos são gerados dinamicamente em HTML com tabelas compatíveis com Outlook, Gmail e Apple Mail.
- **Download em PDF**: O utilizador pode visualizar o recibo como uma página web formatada pronta a imprimir/guardar como PDF.

---

## 🛠️ Detalhes Técnicos de Implementação

### Backend (Node.js)
```javascript
// Exemplo da lógica de criação de encomenda
const result = await db.run(
  "INSERT INTO encomenda (ID_Cliente, Data_Encomenda, Total, Status, Morada, Telefone) VALUES (?, CURRENT_TIMESTAMP, ?, 'Pendente', ?, ?)",
  [userId, total, address, phone]
);
```

### Frontend (Vanilla JS)
```javascript
// Lógica para alternar botões conforme o estado
${order.status === 'Pendente' 
  ? `<button onclick="window.payOrder(${order.id})">Pagar</button>` 
  : `<button onclick="window.downloadReceipt(${order.id})">Recibo</button>`
}
```

---

> [!NOTE]
> Este sistema foi desenhado para ser resiliente a erros: se a ligação ao MySQL falhar, o carrinho não é limpo, garantindo que o utilizador não perde a sua seleção de produtos.
