import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import path from "path";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import compression from "compression";
import { testConnection } from "./config/database.js";

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Previše zahtjeva sa ove IP adrese. Pokušajte ponovo za 15 minuta.",
});
app.use("/api/", limiter);

// CORS configuration
const corsOptions = {
  origin:
    process.env.NODE_ENV === "production"
      ? ["https://rahmetli.me", "https://www.rahmetli.me"]
      : [
          "http://localhost:3002",
          "http://localhost:5173",
          "http://localhost:5174",
        ],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files (frontend)
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "../frontend")));

// API Routes
import authRoutes from "./routes/auth.js";
import postsRoutes from "./routes/posts.js";
import usersRoutes from "./routes/users.js";
import categoriesRoutes from "./routes/categories.js";
import cemeteriesRoutes from "./routes/cemeteries.js";
import commentsRoutes from "./routes/comments.js";
import adminRoutes from "./routes/admin.js";

app.use("/api/auth", authRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/cemeteries", cemeteriesRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// Serve frontend for SPA routing (catch-all)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error("Global error handler:", error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      error: "Duplikat podataka. Molimo provjerite unos.",
    });
  }

  if (error.name === "ValidationError") {
    return res.status(400).json({
      error: "Neispravni podaci",
      details: error.message,
    });
  }

  if (error.name === "JsonWebTokenError") {
    return res.status(401).json({
      error: "Nevaži token. Molimo prijavite se ponovo.",
    });
  }

  res.status(500).json({
    error: "Interna greška servera",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Došlo je do greške",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Stranica nije pronađena",
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    await testConnection();

    app.listen(PORT, () => {
      console.log(`🚀 Server je pokrenuo na portu ${PORT}`);
      console.log(`🌍 Frontend: http://localhost:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Greška pri pokretanju servera:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🔄 Zatvaranje servera...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🔄 Zatvaranje servera...");
  process.exit(0);
});

startServer();
