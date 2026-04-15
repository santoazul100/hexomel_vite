const fs = require('fs');
let content = fs.readFileSync('backend/server.js', 'utf8');

const verifyEmailIndex = content.indexOf('app.get("/api/auth/verify-email"');
const verifyEmailEndIndex = content.indexOf('// Google Auth', verifyEmailIndex);

const endpointsToAdd = `
// Checkout 2FA - Generate
app.post("/api/auth/checkout-2fa/generate", authenticateToken, async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes from now

    await db.run(
      "UPDATE cliente SET Checkout_OTP = ?, Checkout_OTP_Expires = ? WHERE ID_Cliente = ?",
      [otp, expires, req.user.id]
    );

    const user = await db.get("SELECT Email, Nome FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    
    if (mailTransporter) {
      try {
        await mailTransporter.sendMail({
          from: process.env.SMTP_FROM || "Hexomel Segurança <noreply@hexomel.pt>",
          to: user.Email,
          subject: "O seu código de verificação para Checkout — Hexomel",
          html: \`
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1a4d2e;">Código de Segurança</h2>
              <p>Olá \${user.Nome || 'Cliente'},</p>
              <p>O seu código de verificação para prosseguir com a encomenda é:</p>
              <h1 style="background: #f4f7f6; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 5px; color: #f4b400; border-radius: 8px;">\${otp}</h1>
              <p>Este código é válido por 10 minutos. Se não pediu este código, por favor ignore este email.</p>
              <p style="color: #718096; font-size: 0.85em;">A equipa Hexomel</p>
            </div>
          \`
        });
      } catch (emailErr) {
        console.error("2FA Email fail:", emailErr);
      }
    } else {
      console.log(\`⚠️ Dev Mode: OTP para \${user.Email} é \${otp}\`);
    }

    res.json({ message: "Código enviado com sucesso para o seu email." });
  } catch (error) {
    console.error("Generate 2FA error:", error);
    res.status(500).json({ error: "Erro interno ao gerar o código 2FA." });
  }
});

// Checkout 2FA - Verify
app.post("/api/auth/checkout-2fa/verify", authenticateToken, async (req, res) => {
  const { otp } = req.body;
  if (!otp) {
    return res.status(400).json({ error: "O código é obrigatório." });
  }

  try {
    const user = await db.get("SELECT * FROM cliente WHERE ID_Cliente = ?", [req.user.id]);
    
    if (!user.Checkout_OTP || user.Checkout_OTP !== otp) {
      return res.status(400).json({ error: "Código incorreto." });
    }

    if (new Date() > new Date(user.Checkout_OTP_Expires)) {
      return res.status(400).json({ error: "Código expirado. Peça um novo." });
    }

    // Success -> Clear OTP
    await db.run("UPDATE cliente SET Checkout_OTP = NULL, Checkout_OTP_Expires = NULL WHERE ID_Cliente = ?", [req.user.id]);

    const jwt = require('jsonwebtoken');
    // Issue updated token
    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType, checkoutVerified: true },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    res.json({
      message: "Verificação concluída com sucesso!",
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        role: user.UserType || "client",
        checkoutVerified: true
      }
    });

  } catch (error) {
    console.error("Verify 2FA error:", error);
    res.status(500).json({ error: "Erro na verificação." });
  }
});

`;

if (content.indexOf('/api/auth/checkout-2fa/generate') === -1) {
    content = content.slice(0, verifyEmailEndIndex) + endpointsToAdd + content.slice(verifyEmailEndIndex);
}

const checkCode = `  if (!req.user.checkoutVerified) {
    return res.status(401).json({ error: "2FA_REQUIRED" });
  }\n`;

const cartCheckoutIdx = content.indexOf('app.post("/api/cart/checkout"');
const cartCheckoutBodyIdx = content.indexOf('{', cartCheckoutIdx);
if (content.slice(cartCheckoutBodyIdx, cartCheckoutBodyIdx + 200).indexOf('2FA_REQUIRED') === -1) {
    content = content.slice(0, cartCheckoutBodyIdx + 2) + checkCode + content.slice(cartCheckoutBodyIdx + 2);
}

fs.writeFileSync('backend/server.js', content, 'utf8');
console.log('Done modifying server.js');
