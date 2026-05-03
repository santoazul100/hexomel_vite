const fs = require('fs');

let c = fs.readFileSync('backend/server.js', 'utf8');
const splitPoint = '// Get all questions (with answers and author info), sorted by votes desc';
const index = c.indexOf(splitPoint);

if (index === -1) {
  console.log('Split point not found!');
  process.exit(1);
}

const head = c.substring(0, index);

const replacement = `// Get all questions (with answers and author info), sorted by votes desc
app.get("/api/comunidade/perguntas", async (req, res) => {
  try {
    const perguntas = await db.all(\`
      SELECT p.*, c.Nome AS AutorNome, c.Picture AS AutorPicture, c.UserType AS AutorTipo
      FROM pergunta_comunidade p
      JOIN cliente c ON p.ID_Cliente = c.ID_Cliente
      ORDER BY p.Votos DESC, p.Data_Criacao DESC
    \`);

    for (const pergunta of perguntas) {
      pergunta.respostas = await db.all(\`
        SELECT r.*, c.Nome AS AutorNome, c.Picture AS AutorPicture, c.UserType AS AutorTipo
        FROM resposta_comunidade r
        JOIN cliente c ON r.ID_Cliente = c.ID_Cliente
        WHERE r.ID_Pergunta = ?
        ORDER BY r.Melhor_Resposta DESC, r.Votos DESC, r.Data_Criacao ASC
      \`, [pergunta.ID_Pergunta]);
    }

    res.json(perguntas);
  } catch (error) {
    console.error("Q&A fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Post a new question (authenticated)
app.post("/api/comunidade/perguntas", authenticateToken, async (req, res) => {
  const { texto } = req.body;
  if (!texto || texto.trim().length < 10) {
    return res.status(400).json({ error: "A pergunta deve ter pelo menos 10 caracteres." });
  }

  try {
    const safeText = censorText(texto.trim());
    const result = await db.run(
      "INSERT INTO pergunta_comunidade (ID_Cliente, Texto) VALUES (?, ?)",
      [req.user.id, safeText]
    );
    res.status(201).json({ id: result.lastID, message: "Pergunta publicada!" });
  } catch (error) {
    console.error("Q&A question create error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a question (admin or author)
app.delete("/api/comunidade/perguntas/:id", authenticateToken, async (req, res) => {
  try {
    const pergunta = await db.get("SELECT * FROM pergunta_comunidade WHERE ID_Pergunta = ?", [req.params.id]);
    if (!pergunta) return res.status(404).json({ error: "Pergunta não encontrada." });
    if (pergunta.ID_Cliente !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: "Sem permissão." });
    
    await db.run("DELETE FROM pergunta_comunidade WHERE ID_Pergunta = ?", [req.params.id]);
    res.json({ message: "Pergunta removida." });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Post an answer to a question (authenticated)
app.post("/api/comunidade/perguntas/:id/respostas", authenticateToken, async (req, res) => {
  const { texto } = req.body;
  const perguntaId = req.params.id;

  if (!texto || texto.trim().length < 2) {
    return res.status(400).json({ error: "A resposta deve ter pelo menos 2 caracteres." });
  }

  try {
    const pergunta = await db.get("SELECT * FROM pergunta_comunidade WHERE ID_Pergunta = ?", [perguntaId]);
    if (!pergunta) {
      return res.status(404).json({ error: "Pergunta não encontrada." });
    }

    const safeText = censorText(texto.trim());
    const result = await db.run(
      "INSERT INTO resposta_comunidade (ID_Pergunta, ID_Cliente, Texto) VALUES (?, ?, ?)",
      [perguntaId, req.user.id, safeText]
    );
    res.status(201).json({ id: result.lastID, message: "Resposta publicada!" });
  } catch (error) {
    console.error("Q&A answer create error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Vote on a question
app.post("/api/comunidade/perguntas/:id/votar", authenticateToken, async (req, res) => {
  try {
    if (req.body && req.body.action === 'remove') {
      await db.run("UPDATE pergunta_comunidade SET Votos = GREATEST(0, Votos - 1) WHERE ID_Pergunta = ?", [req.params.id]);
      res.json({ message: "Voto removido!" });
    } else {
      await db.run("UPDATE pergunta_comunidade SET Votos = Votos + 1 WHERE ID_Pergunta = ?", [req.params.id]);
      res.json({ message: "Voto registado!" });
    }
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Vote on an answer
app.post("/api/comunidade/respostas/:id/votar", authenticateToken, async (req, res) => {
  try {
    if (req.body && req.body.action === 'remove') {
      await db.run("UPDATE resposta_comunidade SET Votos = GREATEST(0, Votos - 1) WHERE ID_Resposta = ?", [req.params.id]);
      res.json({ message: "Voto removido!" });
    } else {
      await db.run("UPDATE resposta_comunidade SET Votos = Votos + 1 WHERE ID_Resposta = ?", [req.params.id]);
      res.json({ message: "Voto registado!" });
    }
  } catch (error) {
    console.error("Vote error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

startServer();

// ============================================================
// AUTOMATIC CLEANUP: Delete 'Pendente' orders older than 24h
// ============================================================
async function cleanupPendingOrders() {
  try {
    console.log("🧹 Running cleanup for expired pending orders...");
    const result = await db.run(\`
      DELETE FROM encomenda 
      WHERE Status = 'Pendente' 
      AND Data_Encomenda < DATE_SUB(NOW(), INTERVAL 1 DAY)
    \`);
    if (result.changes > 0) {
      console.log(\`✅ Cleaned up \${result.changes} expired orders.\`);
    }
  } catch (error) {
    if (error.code !== "ECONNREFUSED" && error.message !== "Database pool not initialized. Call initDB() first.") {
        console.error("Cleanup error:", error);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupPendingOrders, 60 * 60 * 1000);
// Also run once on startup (with a small delay to ensure DB is ready)
setTimeout(cleanupPendingOrders, 10000);

initializeDatabase().catch((error) => {
  console.error("Unexpected database bootstrap error:", error);
});
`;

fs.writeFileSync('backend/server.js', head + replacement, 'utf8');
console.log('Fixed file.');
