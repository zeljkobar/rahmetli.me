import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import {
  authenticateToken,
  optionalAuth,
  requireModerator,
} from "../middleware/auth.js";
import {
  validatePost,
  validateSearch,
  validateId,
} from "../middleware/validation.js";

// Get all posts with filtering and pagination
router.get("/", validateSearch, optionalAuth, async (req, res) => {
  try {
    const {
      q,
      type,
      location,
      page = 1,
      limit = 12,
      sort = "created_at",
      order = "DESC",
    } = req.query;

    // Convert to numbers
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 12;
    const offset = (pageNum - 1) * limitNum;

    console.log("DEBUG: Parameters before query:", {
      pageNum: typeof pageNum,
      pageNumValue: pageNum,
      limitNum: typeof limitNum,
      limitNumValue: limitNum,
      offset: typeof offset,
      offsetValue: offset,
      searchParams: { q, type, location },
    });

    // Build WHERE conditions based on search parameters
    let whereConditions = [
      "status = ?",
      "(expires_at IS NULL OR expires_at > NOW())",
    ];
    let queryParams = ["approved"];

    // Text search in deceased name
    if (q && q.trim()) {
      whereConditions.push("deceased_name LIKE ?");
      queryParams.push(`%${q.trim()}%`);
    }

    // Search by type (currently only 'umrlica' supported)
    if (type && type !== "all") {
      // For future expansion when we have multiple post types
      console.log("Type filter applied:", type);
    }

    // Location search in burial cemetery and dzenaza location
    if (location && location.trim()) {
      whereConditions.push(
        "(burial_cemetery LIKE ? OR dzenaza_location LIKE ?)"
      );
      queryParams.push(`%${location.trim()}%`, `%${location.trim()}%`);
    }

    const whereClause = whereConditions.join(" AND ");

    // Return all needed fields for PostCard component with family members in single query
    const posts = await executeQuery(
      `SELECT 
         p.id, p.user_id, p.deceased_name, p.deceased_birth_date, p.deceased_death_date, p.deceased_age, p.deceased_gender,
         p.deceased_photo_url, p.dzenaza_date, p.dzenaza_time, p.dzenaza_location, 
         p.burial_cemetery, p.burial_location, p.generated_html as content,
         p.custom_html, p.is_custom_edited, p.status, p.is_premium, p.is_featured, 
         p.expires_at, p.views_count, p.shares_count, p.slug, p.meta_description,
         p.created_at, p.updated_at,
         'dova' as type,
         p.deceased_name as title,
         p.dzenaza_location as location,
         p.dzenaza_location as dzamija,
         'Nepoznat' as author_name,
         'anonymous' as username,
         0 as comments_count,
         NULL as cemetery_name,
         NULL as cemetery_city,
         GROUP_CONCAT(
           CASE WHEN fm.name IS NOT NULL 
           THEN CONCAT(fm.relationship, ' ', fm.name) 
           ELSE NULL END 
           ORDER BY fm.sort_order, fm.id SEPARATOR ', '
         ) as family_members
       FROM posts p
       LEFT JOIN family_members fm ON p.id = fm.post_id
       WHERE ${whereClause}
       GROUP BY p.id, p.user_id, p.deceased_name, p.deceased_birth_date, p.deceased_death_date, 
                p.deceased_age, p.deceased_gender, p.deceased_photo_url, p.dzenaza_date, p.dzenaza_time, 
                p.dzenaza_location, p.burial_cemetery, p.burial_location, p.generated_html,
                p.custom_html, p.is_custom_edited, p.status, p.is_premium, p.is_featured,
                p.expires_at, p.views_count, p.shares_count, p.slug, p.meta_description,
                p.created_at, p.updated_at
       ORDER BY p.is_featured DESC, p.created_at DESC
       LIMIT ${limitNum} OFFSET ${offset}`,
      queryParams
    );

    // Get total count with same filters
    const totalResult = await executeQuerySingle(
      `SELECT COUNT(*) as total 
       FROM posts 
       WHERE ${whereClause}`,
      queryParams
    );

    const total = totalResult ? totalResult.total : 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts: posts || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get posts error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju objava",
    });
  }
});

// Get single post by ID
router.get("/:id", validateId, optionalAuth, async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await executeQuerySingle(
      `
            SELECT 
                p.*,
                u.username,
                u.full_name as author_name,
                c.name as category_name,
                c.slug as category_slug,
                cem.name as cemetery_name,
                cem.city as cemetery_city,
                cem.address as cemetery_address
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN cemeteries cem ON p.cemetery_id = cem.id
            WHERE p.id = ? AND (p.status = 'approved' OR (? AND p.status IN ('pending', 'approved')))
        `,
      [postId, req.user && (req.user.role === 'admin' || req.user.role === 'moderator')]
    );

    if (!post) {
      return res.status(404).json({
        error: "Objava nije pronađena",
      });
    }

    // Increment view count
    await executeQuery(
      "UPDATE posts SET views_count = views_count + 1 WHERE id = ?",
      [postId]
    );

    // Get post images
    const images = await executeQuery(
      "SELECT * FROM post_images WHERE post_id = ? ORDER BY display_order",
      [postId]
    );

    // Get approved comments
    const comments = await executeQuery(
      `
            SELECT 
                c.*,
                u.username,
                u.full_name
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ? AND c.status = 'approved'
            ORDER BY c.created_at DESC
        `,
      [postId]
    );

    res.json({
      post: {
        ...post,
        images,
        comments,
      },
    });
  } catch (error) {
    console.error("Get post error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju objave",
    });
  }
});

// Create new post
router.post("/", authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/posts received:', req.body);
    
    const {
      deceased_name,
      deceased_birth_date,
      deceased_death_date,
      deceased_gender,
      dzenaza_date,
      dzenaza_time,
      dzenaza_location,
      burial_cemetery,
      burial_location,
      cemetery_id,
      category_id,
      custom_html,
      generated_html,
      is_custom_edited = false,
      is_premium = false,
      family_members = [],
    } = req.body;

    const userId = req.user.id;

    // Generate slug
    const slug = `${deceased_name
      .toLowerCase()
      .replace(/\s+/g, "-")}-${Date.now()}`;

    // Set expiry date
    const expiryDays = is_premium ? 90 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Calculate age if birth date provided
    let deceased_age = null;
    if (deceased_birth_date) {
      const birth = new Date(deceased_birth_date);
      const death = new Date(deceased_death_date);
      deceased_age = death.getFullYear() - birth.getFullYear();
    }

    const result = await executeQuery(
      `
            INSERT INTO posts (
                user_id, category_id, cemetery_id, 
                deceased_name, deceased_birth_date, deceased_death_date, deceased_age, deceased_gender,
                dzenaza_date, dzenaza_time, dzenaza_location,
                burial_cemetery, burial_location,
                generated_html, custom_html, is_custom_edited,
                is_premium, expires_at, slug, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        userId,
        category_id || null,
        cemetery_id || null,
        deceased_name,
        deceased_birth_date || null,
        deceased_death_date,
        deceased_age,
        deceased_gender || "male",
        dzenaza_date || deceased_death_date,
        dzenaza_time || "13:00",
        dzenaza_location || "IKC Bar",
        burial_cemetery || "Centralno groblje",
        burial_location || null,
        generated_html || null,
        custom_html || null,
        is_custom_edited,
        is_premium,
        expiresAt,
        slug,
        "pending",
      ]
    );

    const postId = result.insertId;

    // Insert family members if provided
    if (family_members && family_members.length > 0) {
      for (let i = 0; i < family_members.length; i++) {
        const member = family_members[i];
        if (member.name && member.name.trim()) {
          await executeQuery(
            "INSERT INTO family_members (post_id, name, relationship, sort_order) VALUES (?, ?, ?, ?)",
            [postId, member.name.trim(), member.relationship || "", i + 1]
          );
        }
      }
    }

    res.status(201).json({
      success: true,
      message: "Objava je uspješno kreirana",
      post: {
        id: postId,
        status: "pending",
      },
    });
  } catch (error) {
    console.error("Create post error:", error);
    res.status(500).json({
      error: "Greška pri kreiranju objave",
    });
  }
});

// Update post (only by owner or admin)
router.put(
  "/:id",
  authenticateToken,
  validateId,
  validatePost,
  async (req, res) => {
    try {
      const postId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Check if user owns the post or is admin
      const existingPost = await executeQuerySingle(
        "SELECT user_id, status FROM posts WHERE id = ?",
        [postId]
      );

      if (!existingPost) {
        return res.status(404).json({
          error: "Objava nije pronađena",
        });
      }

      if (existingPost.user_id !== userId && userRole !== "admin") {
        return res.status(403).json({
          error: "Nemate dozvolu za ažuriranje ove objave",
        });
      }

      // Reset status to pending if content is modified
      const status = userRole === "admin" ? existingPost.status : "pending";

      const {
        content, // will be mapped to custom_html
        deceased_name,
        deceased_birth_date,
        deceased_death_date,
        location, // will be mapped to dzenaza_location/burial_cemetery
        dzamija, // fallback for dzenaza_location
        dzenaza_time,
        cemetery_id,
        category_id,
      } = req.body;

      await executeQuery(
        `
            UPDATE posts SET 
                category_id = ?, cemetery_id = ?, 
                deceased_name = ?, deceased_birth_date = ?, deceased_death_date = ?,
                dzenaza_date = ?, dzenaza_time = ?, dzenaza_location = ?,
                burial_cemetery = ?, burial_location = ?, 
                custom_html = ?, is_custom_edited = ?, status = ?
            WHERE id = ?
        `,
        [
          category_id || null,
          cemetery_id || null,
          deceased_name,
          deceased_birth_date || null,
          deceased_death_date,
          deceased_death_date, // fallback za dzenaza_date
          dzenaza_time || "13:00",
          location || dzamija || "IKC Bar", // map to dzenaza_location
          location || "Centralno groblje", // map to burial_cemetery  
          null, // burial_location
          content || null, // map content to custom_html
          content ? true : false, // is_custom_edited if content provided
          status,
          postId,
        ]
      );

      res.json({
        message: "Objava je uspješno ažurirana",
        status: status,
      });
    } catch (error) {
      console.error("Update post error:", error);
      res.status(500).json({
        error: "Greška pri ažuriranju objave",
      });
    }
  }
);

// Delete post (only by owner or admin)
router.delete("/:id", authenticateToken, validateId, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user owns the post or is admin
    const existingPost = await executeQuerySingle(
      "SELECT user_id FROM posts WHERE id = ?",
      [postId]
    );

    if (!existingPost) {
      return res.status(404).json({
        error: "Objava nije pronađena",
      });
    }

    if (existingPost.user_id !== userId && userRole !== "admin") {
      return res.status(403).json({
        error: "Nemate dozvolu za brisanje ove objave",
      });
    }

    await executeQuery("DELETE FROM posts WHERE id = ?", [postId]);

    res.json({
      message: "Objava je uspješno obrisana",
    });
  } catch (error) {
    console.error("Delete post error:", error);
    res.status(500).json({
      error: "Greška pri brisanju objave",
    });
  }
});

// Moderate post (admin/moderator only)
router.put("/:id/moderate", requireModerator, validateId, async (req, res) => {
  try {
    const postId = req.params.id;
    const { status, rejection_reason } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Neispravna vrijednost statusa",
      });
    }

    await executeQuery(
      "UPDATE posts SET status = ?, rejection_reason = ? WHERE id = ?",
      [status, rejection_reason || null, postId]
    );

    res.json({
      message: `Objava je ${status === "approved" ? "odobrena" : "odbijena"}`,
    });
  } catch (error) {
    console.error("Moderate post error:", error);
    res.status(500).json({
      error: "Greška pri moderaciji objave",
    });
  }
});

export default router;
