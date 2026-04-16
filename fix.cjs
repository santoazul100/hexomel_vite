const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

const search = `    } catch (error) {
      console.error("Remove favorite error:", error);
      orders,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});`;

const replace = `    } catch (error) {
      console.error("Remove favorite error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

// USER PROFILE ROUTES
app.get("/api/user/profile", authenticateToken, async (req, res) => {
  try {
    const user = await db.get(
      "SELECT ID_Cliente, Nome, Email, Telefone, Morada, Picture, Data_Resgistro, UserType, Bio, Checkout_Verified FROM cliente WHERE ID_Cliente = ?",
      [req.user.id],
    );
    if (!user) return res.status(404).json({ error: "User not found" });

    const orders = await db.all(
      "SELECT ID_Encomenda as id, Data_Encomenda as date, Total as total, Status as status FROM encomenda WHERE ID_Cliente = ? ORDER BY Data_Encomenda DESC",
      [req.user.id],
    );

    res.json({
      id: user.ID_Cliente,
      name: user.Nome,
      email: user.Email,
      phone: user.Telefone,
      address: user.Morada,
      picture: user.Picture,
      role: user.UserType,
      bio: user.Bio,
      dateRegistered: user.Data_Resgistro,
      checkoutVerified: Boolean(user.Checkout_Verified),
      orders,
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});`;

c = c.replace(search, replace);
fs.writeFileSync('backend/server.js', c);
console.log('Done');
