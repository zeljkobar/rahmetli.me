import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import {
  generateToken,
  hashPassword,
  comparePassword,
  generateRandomToken,
} from "../config/auth.js";
import {
  validateUserRegistration,
  validateUserLogin,
} from "../middleware/validation.js";
import { authenticateToken } from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/email.js";

// Register new user
router.post("/register", validateUserRegistration, async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    // Check if user already exists
    const existingUser = await executeQuerySingle(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username]
    );

    if (existingUser) {
      return res.status(409).json({
        error: "Korisnik sa ovim email-om ili korisničkim imenom već postoji",
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Generate verification token
    const verification_token = generateRandomToken();

    // Insert new user
    const result = await executeQuery(
      `INSERT INTO users (username, email, password_hash, full_name, phone, verification_token) 
             VALUES (?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        password_hash,
        full_name,
        phone || null,
        verification_token,
      ]
    );

    // Send verification email (non-blocking)
    sendVerificationEmail(email, username, verification_token).catch(err => {
      console.error('Failed to send verification email:', err);
    });

    // Generate JWT token
    const token = generateToken({
      id: result.insertId,
      username,
      email,
      role: "user",
    });

    res.status(201).json({
      message: "Registracija uspješna. Provjerite email za verifikaciju.",
      token,
      user: {
        id: result.insertId,
        username,
        email,
        full_name,
        role: "user",
        email_verified: false,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      error: "Greška pri registraciji",
    });
  }
});

// Login user
router.post("/login", validateUserLogin, async (req, res) => {
  try {
    const { email_or_username, password } = req.body;

    // Find user by email or username
    const user = await executeQuerySingle(
      "SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1",
      [email_or_username, email_or_username]
    );

    if (!user) {
      return res.status(401).json({
        error: "Neispravni podaci za prijavu",
      });
    }

    // Check password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Neispravni podaci za prijavu",
      });
    }

    // Update last login
    await executeQuery(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id]
    );

    // Generate JWT token
    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    res.json({
      message: "Prijava uspješna",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Greška pri prijavi",
    });
  }
});

// Get current user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    const user = await executeQuerySingle(
      `SELECT id, username, email, full_name, phone, role, 
                    email_verified, last_login, created_at 
             FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        error: "Korisnik nije pronađen",
      });
    }

    res.json({
      user,
    });
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju profila",
    });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user.id;

    // Update user profile
    await executeQuery(
      "UPDATE users SET full_name = ?, phone = ? WHERE id = ?",
      [full_name, phone || null, userId]
    );

    res.json({
      message: "Profil je uspješno ažuriran",
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      error: "Greška pri ažuriranju profila",
    });
  }
});

// Change password
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Get current password hash
    const user = await executeQuerySingle(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );

    // Verify current password
    const isValidPassword = await comparePassword(
      current_password,
      user.password_hash
    );

    if (!isValidPassword) {
      return res.status(400).json({
        error: "Trenutna lozinka nije ispravna",
      });
    }

    // Hash new password
    const new_password_hash = await hashPassword(new_password);

    // Update password
    await executeQuery("UPDATE users SET password_hash = ? WHERE id = ?", [
      new_password_hash,
      userId,
    ]);

    res.json({
      message: "Lozinka je uspješno promijenjena",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      error: "Greška pri promjeni lozinke",
    });
  }
});

// Verify email
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;

    const user = await executeQuerySingle(
      "SELECT id, username, email FROM users WHERE verification_token = ?",
      [token]
    );

    if (!user) {
      return res.status(400).json({
        error: "Nevažeći ili istekli verifikacioni link",
      });
    }

    // Update user email_verified status
    await executeQuery(
      "UPDATE users SET email_verified = TRUE, verification_token = NULL WHERE id = ?",
      [user.id]
    );

    res.json({
      message: "Email adresa je uspješno verifikovana",
      success: true,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      error: "Greška pri verifikaciji email-a",
    });
  }
});

// Request password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email adresa je obavezna",
      });
    }

    const user = await executeQuerySingle(
      "SELECT id, username, email FROM users WHERE email = ?",
      [email]
    );

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return res.json({
        message: "Ako email postoji, poslaćemo vam link za reset lozinke",
      });
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token
    await executeQuery(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
      [resetToken, resetTokenExpires, user.id]
    );

    // Send reset email (non-blocking)
    const { sendPasswordResetEmail } = await import("../utils/email.js");
    sendPasswordResetEmail(user.email, user.username, resetToken).catch(err => {
      console.error('Failed to send password reset email:', err);
    });

    res.json({
      message: "Ako email postoji, poslaćemo vam link za reset lozinke",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      error: "Greška pri slanju zahtjeva za reset lozinke",
    });
  }
});

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: "Token i nova lozinka su obavezni",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Lozinka mora imati najmanje 6 karaktera",
      });
    }

    const user = await executeQuerySingle(
      "SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > NOW()",
      [token]
    );

    if (!user) {
      return res.status(400).json({
        error: "Nevažeći ili istekli reset token",
      });
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update password and clear reset token
    await executeQuery(
      "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
      [password_hash, user.id]
    );

    res.json({
      message: "Lozinka je uspješno promijenjena",
      success: true,
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({
      error: "Greška pri promjeni lozinke",
    });
  }
});

// Logout (client-side token removal)
router.post("/logout", (req, res) => {
  res.json({
    message: "Uspješno ste se odjavili",
  });
});

export default router;
