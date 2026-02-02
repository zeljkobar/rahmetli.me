import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import { authenticateToken, requireAdmin, requireModerator } from "../middleware/auth.js";
import { sendNewPostNotification } from "../utils/email.js";

// Get pending comments (moderator or admin)
router.get(
  "/comments/pending",
  authenticateToken,
  requireModerator,
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

// Update comment status (moderator or admin)
router.put(
  "/comments/:id/status",
  authenticateToken,
  requireModerator,
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

// Get admin statistics (moderator or admin)
router.get("/stats", authenticateToken, requireModerator, async (req, res) => {
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

// Get pending posts (moderator or admin)
router.get(
  "/posts/pending",
  authenticateToken,
  requireModerator,
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

// Update post status (moderator or admin)
router.put(
  "/posts/:id/status",
  authenticateToken,
  requireModerator,
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

      // Get post details before updating
      const post = await executeQuerySingle(
        `SELECT p.*, c.name as cemetery_name, c.city as location 
         FROM posts p 
         LEFT JOIN cemeteries c ON p.cemetery_id = c.id 
         WHERE p.id = ?`,
        [id]
      );

      if (!post) {
        return res.status(404).json({
          error: "Objava nije pronađena",
        });
      }

      // Update post status
      const result = await executeQuery(
        "UPDATE posts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [status, id]
      );

      // If approved, send notifications to subscribed users
      if (status === "approved" && post.location) {
        // Get users subscribed to this city
        const subscribers = await executeQuery(
          `SELECT email, notification_cities 
           FROM users 
           WHERE subscription_status = 'active' 
           AND email IS NOT NULL 
           AND email_verified = TRUE
           AND notification_cities IS NOT NULL`
        );

        subscribers.forEach((subscriber) => {
          try {
            const cities = JSON.parse(subscriber.notification_cities || "[]");
            if (cities.includes(post.location)) {
              sendNewPostNotification(subscriber.email, {
                id: post.id,
                deceased_name: post.deceased_name,
                location: post.location,
                death_date: post.death_date,
                funeral_date: post.funeral_date,
              }).catch((err) =>
                console.error("Failed to send notification:", err)
              );
            }
          } catch (e) {
            console.error("Error parsing notification_cities:", e);
          }
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
        u.last_login,
        COUNT(p.id) as posts_count
      FROM users u
      LEFT JOIN posts p ON u.id = p.user_id
      GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at, u.last_login
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

// Update user role (admin only)
router.put(
  "/users/:id/role",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      // Validate role
      if (!['user', 'moderator', 'admin'].includes(role)) {
        return res.status(400).json({
          error: "Nevalidna uloga. Dozvoljene uloge: user, moderator, admin",
        });
      }

      // Don't allow changing own role
      if (parseInt(id) === req.user.id) {
        return res.status(400).json({
          error: "Ne možete promeniti svoju vlastitu ulogu",
        });
      }

      // Update user role
      const result = await executeQuery(
        "UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [role, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: "Korisnik nije pronađen",
        });
      }

      // Get role label
      const roleLabels = {
        user: 'Korisnik',
        moderator: 'Moderator',
        admin: 'Administrator'
      };

      res.json({
        message: `Uloga korisnika je promenjena u ${roleLabels[role]}`,
        role: role,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju uloge korisnika",
      });
    }
  }
);

// Get detailed statistics (moderator or admin)
router.get(
  "/stats/detailed",
  authenticateToken,
  requireModerator,
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

// ============================================
// SUBSCRIPTION MANAGEMENT ENDPOINTS
// ============================================

// Get all subscriptions (pending, active, expired)
router.get(
  "/subscriptions",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { status } = req.query;
      let whereClause = "";
      let params = [];

      if (status && status !== "all") {
        whereClause = "WHERE s.status = ?";
        params.push(status);
      }

      const subscriptions = await executeQuery(
        `SELECT 
          s.*,
          u.username,
          u.email,
          u.full_name,
          u.notification_cities,
          DATEDIFF(s.end_date, CURDATE()) as days_remaining,
          activator.full_name as activated_by_name
        FROM subscriptions s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN users activator ON s.activated_by = activator.id
        ${whereClause}
        ORDER BY s.created_at DESC`,
        params
      );

      res.json({ subscriptions });
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({
        error: "Greška pri dohvatanju pretplata",
      });
    }
  }
);

// Activate subscription manually
router.post(
  "/subscriptions/:id/activate",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const subscriptionId = req.params.id;
      const { payment_reference, admin_notes } = req.body;
      const adminId = req.user.id;

      // Call stored procedure
      await executeQuery("CALL ActivateSubscription(?, ?, ?, ?)", [
        subscriptionId, // user_id će se dobiti iz subscription zapisa
        payment_reference,
        adminId,
        admin_notes || "Manuelno aktivirana pretplata",
      ]);

      // Get subscription details to extract user_id
      const subscription = await executeQuerySingle(
        "SELECT user_id FROM subscriptions WHERE id = ?",
        [subscriptionId]
      );

      if (!subscription) {
        return res.status(404).json({ error: "Pretplata nije pronađena" });
      }

      // Update subscription with payment info
      await executeQuery(
        `UPDATE subscriptions 
         SET 
           status = 'active',
           payment_reference = ?,
           payment_completed_at = NOW(),
           admin_notes = ?,
           manually_activated = TRUE,
           activated_by = ?
         WHERE id = ?`,
        [payment_reference, admin_notes, adminId, subscriptionId]
      );

      // Update user subscription status
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      await executeQuery(
        `UPDATE users 
         SET 
           subscription_status = 'active',
           subscription_start = ?,
           subscription_end = ?
         WHERE id = ?`,
        [
          startDate.toISOString().split("T")[0],
          endDate.toISOString().split("T")[0],
          subscription.user_id,
        ]
      );

      res.json({
        success: true,
        message: "Pretplata uspješno aktivirana",
      });
    } catch (error) {
      console.error("Error activating subscription:", error);
      res.status(500).json({
        error: "Greška pri aktivaciji pretplate",
      });
    }
  }
);

// Cancel subscription
router.post(
  "/subscriptions/:id/cancel",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const subscriptionId = req.params.id;
      const { reason } = req.body;

      await executeQuery(
        `UPDATE subscriptions 
         SET status = 'cancelled', admin_notes = ? 
         WHERE id = ?`,
        [reason || "Otkazana od strane admina", subscriptionId]
      );

      // Get user_id
      const subscription = await executeQuerySingle(
        "SELECT user_id FROM subscriptions WHERE id = ?",
        [subscriptionId]
      );

      if (subscription) {
        await executeQuery(
          `UPDATE users 
           SET subscription_status = 'expired' 
           WHERE id = ?`,
          [subscription.user_id]
        );
      }

      res.json({
        success: true,
        message: "Pretplata otkazana",
      });
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      res.status(500).json({
        error: "Greška pri otkazivanju pretplate",
      });
    }
  }
);

// ============= CEMETERY MANAGEMENT =============

// Create cemetery (moderator or admin)
router.post(
  "/cemeteries",
  authenticateToken,
  requireModerator,
  async (req, res) => {
    try {
      const { name, city, address, latitude, longitude, description } =
        req.body;

      if (!name || !city || !address) {
        return res.status(400).json({
          error: "Ime, grad i adresa su obavezni",
        });
      }

      const result = await executeQuery(
        `INSERT INTO cemeteries (name, city, address, latitude, longitude, description, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          name,
          city,
          address,
          latitude || null,
          longitude || null,
          description || null,
        ]
      );

      res.json({
        success: true,
        message: "Mezaristan uspješno dodat",
        id: result.insertId,
      });
    } catch (error) {
      console.error("Error creating cemetery:", error);
      res.status(500).json({
        error: "Greška pri dodavanju mezaristana",
      });
    }
  }
);

// Update cemetery (moderator or admin)
router.put(
  "/cemeteries/:id",
  authenticateToken,
  requireModerator,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, city, address, latitude, longitude, description } =
        req.body;

      if (!name || !city || !address) {
        return res.status(400).json({
          error: "Ime, grad i adresa su obavezni",
        });
      }

      await executeQuery(
        `UPDATE cemeteries 
         SET name = ?, city = ?, address = ?, latitude = ?, longitude = ?, description = ?, needs_review = 0
         WHERE id = ?`,
        [
          name,
          city,
          address,
          latitude || null,
          longitude || null,
          description || null,
          id,
        ]
      );

      res.json({
        success: true,
        message: "Mezaristan uspješno ažuriran",
      });
    } catch (error) {
      console.error("Error updating cemetery:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju mezaristana",
      });
    }
  }
);

// Delete cemetery (soft delete) (moderator or admin)
router.delete(
  "/cemeteries/:id",
  authenticateToken,
  requireModerator,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if cemetery has posts
      const posts = await executeQuerySingle(
        "SELECT COUNT(*) as count FROM posts WHERE cemetery_id = ?",
        [id]
      );

      if (posts.count > 0) {
        return res.status(400).json({
          error: `Ne možete obrisati mezaristan koji ima ${posts.count} objava`,
        });
      }

      // Soft delete
      await executeQuery("UPDATE cemeteries SET is_active = 0 WHERE id = ?", [
        id,
      ]);

      res.json({
        success: true,
        message: "Mezaristan uspješno obrisan",
      });
    } catch (error) {
      console.error("Error deleting cemetery:", error);
      res.status(500).json({
        error: "Greška pri brisanju mezaristana",
      });
    }
  }
);

export default router;
