import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

// Get pending comments (admin only)
router.get("/comments/pending", authenticateToken, requireAdmin, async (req, res) => {
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
});

// Update comment status (admin only)
router.put("/comments/:id/status", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: "Nevaljan status komentara"
      });
    }

    // Update comment status
    const result = await executeQuery(
      "UPDATE comments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Komentar nije pronađen"
      });
    }

    res.json({
      message: `Komentar je ${status === 'approved' ? 'odobren' : 'odbačen'}`,
      status: status
    });
  } catch (error) {
    console.error("Error updating comment status:", error);
    res.status(500).json({
      error: "Greška pri ažuriranju statusa komentara",
    });
  }
});

// Get admin statistics
router.get("/stats", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = {};
    
    // Count pending comments
    const pendingResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM comments WHERE status = 'pending'"
    );
    stats.pendingComments = pendingResult.count;

    // Count total comments
    const totalResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM comments"
    );
    stats.totalComments = totalResult.count;

    // Count total posts
    const postsResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM posts"
    );
    stats.totalPosts = postsResult.count;

    // Count total users
    const usersResult = await executeQuerySingle(
      "SELECT COUNT(*) as count FROM users"
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

export default router;