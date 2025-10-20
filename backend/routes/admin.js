import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

// Get pending comments (admin only)
router.get(
  "/comments/pending",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const pendingComments = await executeQuery(`
      SELECT 
        c.id,
        c.content,
        c.author_name,
        c.author_email,
        c.created_at,
        p.deceased_name as post_title,
        p.id as post_id
      FROM comments c
      JOIN posts p ON c.post_id = p.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at DESC
    `);

      res.json(pendingComments);
    } catch (error) {
      console.error("Error fetching pending comments:", error);
      res.status(500).json({
        error: "Greška pri dohvatanju komentara na čekanju",
      });
    }
  }
);

// Update comment status (admin only)
router.put(
  "/comments/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          error: "Nevaljan status komentara",
        });
      }

      // Update comment status
      const result = await executeQuery(
        "UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Komentar nije pronađen",
        });
      }

      res.json({
        message: `Komentar je ${status === "approved" ? "odobren" : "odbačen"}`,
        status: status,
      });
    } catch (error) {
      console.error("Error updating comment status:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju statusa komentara",
      });
    }
  }
);

// Get admin statistics
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {};

    // Count pending comments
    const pendingCommentsResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM comments WHERE status = 'pending'"
    );
    stats.pendingComments = pendingCommentsResult.count;

    // Count pending posts
    const pendingPostsResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM posts WHERE status = 'pending'"
    );
    stats.pendingPosts = pendingPostsResult.count;

    // Count total users
    const usersResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM users WHERE is_active = 1"
    );
    stats.totalUsers = usersResult.count;

    res.json(stats);
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju statistika",
    });
  }
});

// Get pending posts (admin only)
router.get(
  "/posts/pending",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const pendingPosts = await executeQuery(`
      SELECT 
        p.id,
        p.deceased_name,
        p.dzenaza_date,
        p.dzenaza_time,
        p.dzenaza_location,
        p.burial_cemetery,
        p.created_at,
        u.username,
        u.email as user_email
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.status = 'pending'
      ORDER BY p.created_at DESC
    `);

      res.json(pendingPosts);
    } catch (error) {
      console.error("Error fetching pending posts:", error);
      res.status(500).json({
        error: "Greška pri dohvatanju objava na čekanju",
      });
    }
  }
);

// Update post status (admin only)
router.put(
  "/posts/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({
          error: "Nevaljan status objave",
        });
      }

      // Update post status
      const result = await executeQuery(
        "UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Objava nije pronađena",
        });
      }

      res.json({
        message: `Objava je ${status === "approved" ? "odobrena" : "odbačena"}`,
        status: status,
      });
    } catch (error) {
      console.error("Error updating post status:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju statusa objave",
      });
    }
  }
);

// Get all users (admin only)
router.get("/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await executeQuery(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.full_name,
        u.role,
        u.is_active,
        u.created_at,
        u.posts_count,
        u.last_login
      FROM users u
      ORDER BY u.created_at DESC
    `);

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju korisnika",
    });
  }
});

// Update user status (admin only)
router.put(
  "/users/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;

      // Don't allow deactivating self
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          error: "Ne možete deaktivirati svoj vlastiti nalog",
        });
      }

      // Update user status
      const result = await executeQuery(
        "UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [is_active, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Korisnik nije pronađen",
        });
      }

      res.json({
        message: `Korisnik je ${is_active ? "aktiviran" : "deaktiviran"}`,
        is_active: is_active,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju korisnika",
      });
    }
  }
);

// Get detailed statistics (admin only)
router.get(
  "/stats/detailed",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const stats = {};

      // Users stats
      const totalUsers = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM users"
      );
      const activeUsers = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM users WHERE is_active = 1"
      );
      const thisMonthUsers = await executeQuerySingle(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)
    `);

      stats.users = {
        total: totalUsers.count,
        active: activeUsers.count,
        thisMonth: thisMonthUsers.count,
      };

      // Posts stats
      const totalPosts = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM posts"
      );
      const approvedPosts = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM posts WHERE status = 'approved'"
      );
      const pendingPosts = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM posts WHERE status = 'pending'"
      );

      stats.posts = {
        total: totalPosts.count,
        approved: approvedPosts.count,
        pending: pendingPosts.count,
      };

      // Comments stats
      const totalComments = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM comments"
      );
      const approvedComments = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM comments WHERE status = 'approved'"
      );
      const pendingComments = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM comments WHERE status = 'pending'"
      );

      stats.comments = {
        total: totalComments.count,
        approved: approvedComments.count,
        pending: pendingComments.count,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching detailed stats:", error);
      res.status(500).json({
        error: "Greška pri dohvatanju detaljnih statistika",
      });
    }
  }
);
export default router;
