
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
  console.error("DATABASE_URL et JWT_SECRET sont obligatoires.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

app.use(helmet({ contentSecurityPolicy: false }));

app.use(cors({
  origin: process.env.FRONTEND_URL || "https://escovon.onrender.com"
}));

app.use(express.json({ limit: "10kb" }));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

// Création de la table des membres
async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      nom VARCHAR(100) NOT NULL,
      prenom VARCHAR(100) NOT NULL,
      telephone VARCHAR(30) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// Vérification du serveur
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      success: true,
      message: "Le serveur ESCOVON fonctionne.",
      database: "connected"
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "La base de données est indisponible."
    });
  }
});

// Inscription
app.post("/api/auth/register", authLimiter, async (req, res) => {
  try {
    const { nom, prenom, telephone, email, password } = req.body;

    if (!nom || !prenom || !telephone || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Tous les champs sont obligatoires."
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Le mot de passe doit contenir au moins 8 caractères."
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(telephone).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Adresse e-mail invalide."
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO users
       (nom, prenom, telephone, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nom, prenom, telephone, email, created_at`,
      [
        String(nom).trim(),
        String(prenom).trim(),
        cleanPhone,
        cleanEmail,
        passwordHash
      ]
    );

    const user = result.rows[0];

    const token = jwt.sign(
      { sub: String(user.id) },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Votre compte ESCOVON a été créé.",
      token,
      user
    });

  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Cet e-mail ou ce téléphone est déjà utilisé."
      });
    }

    console.error("Erreur inscription :", error.message);

    res.status(500).json({
      success: false,
      message: "Impossible de créer le compte."
    });
  }
});

// Connexion
app.post("/api/auth/login", authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifiant et mot de passe obligatoires."
      });
    }

    const value = String(identifier).trim();

    const result = await pool.query(
      `SELECT * FROM users
       WHERE email = $1 OR telephone = $2
       LIMIT 1`,
      [value.toLowerCase(), value]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Identifiant ou mot de passe incorrect."
      });
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordIsValid) {
      return res.status(401).json({
        success: false,
        message: "Identifiant ou mot de passe incorrect."
      });
    }

    const token = jwt.sign(
      { sub: String(user.id) },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Connexion réussie.",
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone,
        email: user.email,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error("Erreur connexion :", error.message);

    res.status(500).json({
      success: false,
      message: "Erreur pendant la connexion."
    });
  }
});

// Protection des pages privées
async function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Connexion nécessaire."
    });
  }

  try {
    const token = authorization.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `SELECT id, nom, prenom, telephone, email, created_at
       FROM users WHERE id = $1`,
      [decoded.sub]
    );

    if (!result.rows[0]) {
      return res.status(401).json({
        success: false,
        message: "Compte introuvable."
      });
    }

    req.user = result.rows[0];
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session invalide ou expirée."
    });
  }
}

// Informations du membre connecté
app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(require("path").join(__dirname, "index.html"));
});

// Démarrage du serveur
async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, () => {
      console.log(`ESCOVON fonctionne sur le port ${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer ESCOVON :", error.message);
    process.exit(1);
  }
}

startServer();

