import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import { authenticateToken, optionalAuth } from "../middleware/auth.js";
import { validateComment, validateId } from "../middleware/validation.js";
import {
  sendCommentNotification,
  sendAdminPendingCommentNotification,
} from "../utils/email.js";

// Get comments for a specific post
router.get("/post/:id", validateId, optionalAuth, async (req, res) => {
  try {
    const postId = req.params.id;

    const comments = await executeQuery(
      `SELECT 
         c.id, c.user_id, c.post_id, c.content, c.status, 
         c.created_at, c.updated_at,
         u.full_name, u.username, u.email,
         COALESCE(u.full_name, 'Anoniman') as author_name,
         COALESCE(u.username, 'anonymous') as author_username
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ? AND c.status = 'approved'
       ORDER BY c.created_at ASC`,
      [postId]
    );

    res.json({
      comments: comments || [],
      total: comments ? comments.length : 0,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju komentara",
    });
  }
});

// Create new comment
router.post("/", validateComment, authenticateToken, async (req, res) => {
  try {
    const { post_id, content } = req.body;
    const user_id = req.user.id;

    // Check if user has active subscription
    const user = await executeQuerySingle(
      "SELECT subscription_status FROM users WHERE id = ?",
      [user_id]
    );

    if (!user || user.subscription_status !== "active") {
      return res.status(403).json({
        error: "Potrebna je aktivna pretplata za izjavljivanje hatara",
        requiresSubscription: true,
      });
    }

    // Check if post exists
    const post = await executeQuerySingle(
      "SELECT id FROM posts WHERE id = ? AND status = 'approved'",
      [post_id]
    );

    if (!post) {
      return res.status(404).json({
        error: "Objava nije pronađena",
      });
    }

    // Insert comment with pending status
    const result = await executeQuery(
      `INSERT INTO comments (user_id, post_id, content, status, created_at, updated_at)
       VALUES (?, ?, ?, 'pending', NOW(), NOW())`,
      [user_id, post_id, content]
    );

    const commentId = result.insertId;

    // Get the created comment with user info and post details
    const newComment = await executeQuerySingle(
      `SELECT 
         c.id, c.user_id, c.post_id, c.content, c.status, 
         c.created_at, c.updated_at,
         u.full_name, u.username, u.email,
         COALESCE(u.full_name, 'Anoniman') as author_name,
         COALESCE(u.username, 'anonymous') as author_username,
         p.deceased_name, p.user_id as post_author_id,
         author.email as post_author_email
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN posts p ON c.post_id = p.id
       LEFT JOIN users author ON p.user_id = author.id
       WHERE c.id = ?`,
      [commentId]
    );

    // Send email notification to post author (non-blocking)
    if (newComment.post_author_email && newComment.post_author_id !== user_id) {
      sendCommentNotification(
        newComment.post_author_email,
        {
          id: newComment.id,
          author_name: newComment.author_name,
          content: newComment.content,
          created_at: newComment.created_at,
        },
        {
          id: newComment.post_id,
          deceased_name: newComment.deceased_name,
        }
      ).catch((err) =>
        console.error("Failed to send comment notification:", err)
      );
    }

    // Send notification to admin (non-blocking)
    const admins = await executeQuery(
      "SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL"
    );

    admins.forEach((admin) => {
      sendAdminPendingCommentNotification(
        admin.email,
        {
          id: newComment.id,
          author_name: newComment.author_name,
          content: newComment.content,
          created_at: newComment.created_at,
        },
        {
          id: newComment.post_id,
          deceased_name: newComment.deceased_name,
        }
      ).catch((err) =>
        console.error("Failed to send admin notification:", err)
      );
    });

    res.status(201).json({
      message: "Komentar je uspešno poslat na moderaciju",
      comment: newComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({
      error: "Greška pri kreiranju komentara",
    });
  }
});

// Update comment (only by author or admin)
router.put(
  "/:id",
  validateId,
  validateComment,
  authenticateToken,
  async (req, res) => {
    try {
      const commentId = req.params.id;
      const { content } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check if comment exists and user has permission
      const comment = await executeQuerySingle(
        "SELECT id, user_id FROM comments WHERE id = ?",
        [commentId]
      );

      if (!comment) {
        return res.status(404).json({
          error: "Komentar nije pronađen",
        });
      }

      if (
        comment.user_id !== userId &&
        userRole !== "admin" &&
        userRole !== "moderator"
      ) {
        return res.status(403).json({
          error: "Nemate dozvolu za editovanje ovog komentara",
        });
      }

      // Update comment and set status to pending if edited by user
      const newStatus =
        userRole === "admin" || userRole === "moderator"
          ? "approved"
          : "pending";

      await executeQuery(
        "UPDATE comments SET content = ?, status = ?, updated_at = NOW() WHERE id = ?",
        [content, newStatus, commentId]
      );

      // Get updated comment
      const updatedComment = await executeQuerySingle(
        `SELECT 
         c.id, c.user_id, c.post_id, c.content, c.status, 
         c.created_at, c.updated_at,
         u.full_name, u.username, u.email,
         COALESCE(u.full_name, 'Anoniman') as author_name,
         COALESCE(u.username, 'anonymous') as author_username
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
        [commentId]
      );

      res.json({
        message: "Komentar je uspešno ažuriran",
        comment: updatedComment,
      });
    } catch (error) {
      console.error("Update comment error:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju komentara",
      });
    }
  }
);

// Delete comment (only by author or admin)
router.delete("/:id", validateId, authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if comment exists and user has permission
    const comment = await executeQuerySingle(
      "SELECT id, user_id FROM comments WHERE id = ?",
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({
        error: "Komentar nije pronađen",
      });
    }

    if (
      comment.user_id !== userId &&
      userRole !== "admin" &&
      userRole !== "moderator"
    ) {
      return res.status(403).json({
        error: "Nemate dozvolu za brisanje ovog komentara",
      });
    }

    await executeQuery("DELETE FROM comments WHERE id = ?", [commentId]);

    res.json({
      message: "Komentar je uspešno obrisan",
    });
  } catch (error) {
    console.error("Delete comment error:", error);
    res.status(500).json({
      error: "Greška pri brisanju komentara",
    });
  }
});

// Admin routes for comment moderation
router.get("/pending", authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;

    if (userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({
        error: "Nemate dozvolu za pristup ovoj stranici",
      });
    }

    const comments = await executeQuery(
      `SELECT 
         c.id, c.user_id, c.post_id, c.content, c.status, 
         c.created_at, c.updated_at,
         u.full_name, u.username, u.email,
         p.deceased_name as post_title,
         COALESCE(u.full_name, 'Anoniman') as author_name,
         COALESCE(u.username, 'anonymous') as author_username
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       LEFT JOIN posts p ON c.post_id = p.id
       WHERE c.status = 'pending'
       ORDER BY c.created_at DESC`
    );

    res.json({
      comments: comments || [],
    });
  } catch (error) {
    console.error("Get pending comments error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju komentara na čekanju",
    });
  }
});

// Approve comment (admin/moderator only)
router.patch(
  "/:id/approve",
  validateId,
  authenticateToken,
  async (req, res) => {
    try {
      const commentId = req.params.id;
      const userRole = req.user.role;

      if (userRole !== "admin" && userRole !== "moderator") {
        return res.status(403).json({
          error: "Nemate dozvolu za ovu akciju",
        });
      }

      const comment = await executeQuerySingle(
        "SELECT id FROM comments WHERE id = ?",
        [commentId]
      );

      if (!comment) {
        return res.status(404).json({
          error: "Komentar nije pronađen",
        });
      }

      await executeQuery(
        "UPDATE comments SET status = 'approved', updated_at = NOW() WHERE id = ?",
        [commentId]
      );

      res.json({
        message: "Komentar je odobren",
      });
    } catch (error) {
      console.error("Approve comment error:", error);
      res.status(500).json({
        error: "Greška pri odobravanju komentara",
      });
    }
  }
);

// Reject comment (admin/moderator only)
router.patch("/:id/reject", validateId, authenticateToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const userRole = req.user.role;

    if (userRole !== "admin" && userRole !== "moderator") {
      return res.status(403).json({
        error: "Nemate dozvolu za ovu akciju",
      });
    }

    const comment = await executeQuerySingle(
      "SELECT id FROM comments WHERE id = ?",
      [commentId]
    );

    if (!comment) {
      return res.status(404).json({
        error: "Komentar nije pronađen",
      });
    }

    await executeQuery(
      "UPDATE comments SET status = 'rejected', updated_at = NOW() WHERE id = ?",
      [commentId]
    );

    res.json({
      message: "Komentar je odbačen",
    });
  } catch (error) {
    console.error("Reject comment error:", error);
    res.status(500).json({
      error: "Greška pri odbacivanju komentara",
    });
  }
});

export default router;
