import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

// Get user profile (public)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const user = await executeQuerySingle(
      `
            SELECT 
                id, username, full_name, created_at,
                (SELECT COUNT(*) FROM posts WHERE user_id = ? AND status = 'approved') as posts_count
            FROM users 
            WHERE id = ? AND is_active = 1
        `,
      [id, id]
    );

    if (!user) {
      return res.status(404).json({
        error: "Korisnik nije pronađen",
      });
    }

    // Get user's recent posts
    const recentPosts = await executeQuery(
      `
            SELECT 
                id, 
                deceased_name as title,
                deceased_name,
                'dzenaza' as type,
                dzenaza_date,
                status,
                created_at
            FROM posts 
            WHERE user_id = ? AND status = 'approved'
            ORDER BY created_at DESC
            LIMIT 5
        `,
      [id]
    );

    res.json({
      user: {
        ...user,
        recentPosts,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju korisničkog profila",
    });
  }
});

// Get all users (admin only)
router.get("/", requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(
        "(username LIKE ? OR email LIKE ? OR full_name LIKE ?)"
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      whereConditions.push("role = ?");
      params.push(role);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const users = await executeQuery(
      `
            SELECT 
                u.id, u.username, u.email, u.full_name, u.role, 
                u.is_active, u.email_verified, u.last_login, u.created_at,
                COUNT(p.id) as posts_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            ${whereClause}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `,
      [...params, limit, offset]
    );

    // Get total count
    const totalResult = await executeQuerySingle(
      `
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `,
      params
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju korisnika",
    });
  }
});

// Update user role/status (admin only)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, is_active } = req.body;

    // Validate role
    if (role && !["user", "moderator", "admin"].includes(role)) {
      return res.status(400).json({
        error: "Neispravna uloga",
      });
    }

    const user = await executeQuerySingle("SELECT id FROM users WHERE id = ?", [
      id,
    ]);

    if (!user) {
      return res.status(404).json({
        error: "Korisnik nije pronađen",
      });
    }

    // Don't allow admin to deactivate themselves
    if (req.user.id === parseInt(id) && is_active === false) {
      return res.status(400).json({
        error: "Ne možete deaktivirati svoj nalog",
      });
    }

    let updates = [];
    let params = [];

    if (role !== undefined) {
      updates.push("role = ?");
      params.push(role);
    }

    if (is_active !== undefined) {
      updates.push("is_active = ?");
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: "Nema podataka za ažuriranje",
      });
    }

    params.push(id);

    await executeQuery(
      `
            UPDATE users 
            SET ${updates.join(", ")} 
            WHERE id = ?
        `,
      params
    );

    res.json({
      message: "Korisnik je uspješno ažuriran",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      error: "Greška pri ažuriranju korisnika",
    });
  }
});

// Delete user (admin only)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow admin to delete themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        error: "Ne možete obrisati svoj nalog",
      });
    }

    const user = await executeQuerySingle("SELECT id FROM users WHERE id = ?", [
      id,
    ]);

    if (!user) {
      return res.status(404).json({
        error: "Korisnik nije pronađen",
      });
    }

    // Instead of deleting, deactivate the user and anonymize data
    await executeQuery(
      `
            UPDATE users 
            SET 
                is_active = 0,
                email = CONCAT('deleted_', id, '@rahmetli.me'),
                username = CONCAT('deleted_user_', id),
                full_name = 'Obrisani korisnik',
                phone = NULL
            WHERE id = ?
        `,
      [id]
    );

    res.json({
      message: "Korisnik je uspješno obrisan",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      error: "Greška pri brisanju korisnika",
    });
  }
});

// Update my profile (authenticated user)
router.put("/me/profile", authenticateToken, async (req, res) => {
  try {
    const { full_name, phone } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!full_name || full_name.trim().length < 2) {
      return res.status(400).json({
        error: "Ime i prezime mora imati najmanje 2 karaktera",
      });
    }

    await executeQuery(
      "UPDATE users SET full_name = ?, phone = ? WHERE id = ?",
      [full_name.trim(), phone || null, userId]
    );

    // Get updated user data
    const updatedUser = await executeQuerySingle(
      "SELECT id, username, email, full_name, phone, role FROM users WHERE id = ?",
      [userId]
    );

    res.json({
      message: "Profil je uspješno ažuriran",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      error: "Greška pri ažuriranju profila",
    });
  }
});

// Change password (authenticated user)
router.put("/me/password", authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({
        error: "Trenutna i nova lozinka su obavezne",
      });
    }

    if (new_password.length < 8) {
      return res.status(400).json({
        error: "Nova lozinka mora imati najmanje 8 karaktera",
      });
    }

    // Get current user
    const user = await executeQuerySingle(
      "SELECT password_hash FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        error: "Korisnik nije pronađen",
      });
    }

    // Verify current password
    const { comparePassword, hashPassword } = await import("../config/auth.js");
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
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await executeQuery("UPDATE users SET password_hash = ? WHERE id = ?", [
      newPasswordHash,
      userId,
    ]);

    res.json({
      message: "Lozinka je uspješno promenjena",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      error: "Greška pri promeni lozinke",
    });
  }
});

// Get my posts (authenticated user)
router.get("/me/posts", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    let whereClause = "WHERE p.user_id = ?";
    let params = [userId];

    // Only add status filter if status is provided and not empty
    if (status && status.trim() !== "") {
      whereClause += " AND p.status = ?";
      params.push(status.trim());
    }

    const posts = await executeQuery(
      `SELECT p.id, p.deceased_name, p.status, p.created_at, p.updated_at, cat.name as category_name 
       FROM posts p 
       LEFT JOIN categories cat ON p.category_id = cat.id 
       ${whereClause}
       ORDER BY p.created_at DESC`,
      params
    );

    // Get total count
    const totalResult = await executeQuerySingle(
      `SELECT COUNT(*) as total FROM posts p ${whereClause}`,
      params
    );

    const total = totalResult.total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      posts: posts || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Get my posts error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju objava",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

export default router;
