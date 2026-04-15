const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const brokenLoginBlock = `
// Login
  }
});
`;

const workingLoginBlock = `
// Login
app.post("/api/auth/login", async (req, res) => {
  let identifier = req.body.identifier || req.body.email;
  const { password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "Email/username e password são obrigatórios" });
  }

  identifier = identifier.toLowerCase().trim();

  try {
    let user = await db.get("SELECT * FROM cliente WHERE Email = ? OR Username = ?", [identifier, identifier]);
    if (!user) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const isMatch = await bcrypt.compare(password, user.Senha);
    if (!isMatch) {
      return res.status(400).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      { id: user.ID_Cliente, role: user.UserType },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    res.json({
      token,
      user: {
        id: user.ID_Cliente,
        name: user.Nome,
        email: user.Email,
        picture: user.Picture,
        UserType: user.UserType || "client",
        role: user.UserType || "client",
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
`;

// Try CRLF
let replaced = content.replace(brokenLoginBlock.replace(/\n/g, '\r\n'), workingLoginBlock.replace(/\n/g, '\r\n'));

// Try LF if no match
if (replaced.length === content.length) {
    replaced = content.replace(brokenLoginBlock.replace(/\r\n/g, '\n'), workingLoginBlock.replace(/\r\n/g, '\n'));
}

// Try generic replace (ignoring exact newlines by using regex)
if (replaced.length === content.length) {
    const rx = /\/\/ Login[\s\S]*?\}\s*\r?\n\}\);/;
    replaced = content.replace(rx, workingLoginBlock);
}

fs.writeFileSync('server.js', replaced, 'utf8');
console.log("Replaced successfully: " + (replaced.length !== content.length));
