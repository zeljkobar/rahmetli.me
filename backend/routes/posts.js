import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";
import {
  authenticateToken,
  optionalAuth,
  requireModerator,
} from "../middleware/auth.js";
import { sendAdminPendingPostNotification } from "../utils/email.js";
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
      dateFrom,
      page = 1,
      limit = 12, // BACKEND DEFAULT: Broj postova po stranici ako frontend ne pošalje
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
      "p.status = ?",
      "(p.expires_at IS NULL OR p.expires_at > NOW())",
    ];
    let queryParams = ["approved"];

    // Text search in deceased name
    if (q && q.trim()) {
      whereConditions.push("p.deceased_name LIKE ?");
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
        "(p.burial_cemetery LIKE ? OR p.dzenaza_location LIKE ?)"
      );
      queryParams.push(`%${location.trim()}%`, `%${location.trim()}%`);
    }

    // Date filter - posts created after specified date
    if (dateFrom && dateFrom.trim()) {
      console.log("Date filter received:", dateFrom);
      whereConditions.push("p.created_at >= ?");
      queryParams.push(dateFrom.trim());
    }

    const whereClause = whereConditions.join(" AND ");
    console.log("WHERE clause:", whereClause);
    console.log("Query params:", queryParams);

    // Set higher GROUP_CONCAT limit for hatar sessions
    await executeQuery("SET SESSION group_concat_max_len = 10000");

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
         ) as family_members,
         GROUP_CONCAT(
           CASE WHEN hs.id IS NOT NULL 
           THEN JSON_OBJECT(
             'id', hs.id,
             'date', hs.session_date,
             'time_start', hs.session_time_start,
             'time_end', hs.session_time_end,
             'location', hs.session_location,
             'note', hs.session_note
           )
           ELSE NULL END 
           ORDER BY hs.sort_order, hs.session_date, hs.session_time_start SEPARATOR '||'
         ) as hatar_sessions
       FROM posts p
       LEFT JOIN family_members fm ON p.id = fm.post_id
       LEFT JOIN hatar_sessions hs ON p.id = hs.post_id
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

    // Parse hatar_sessions from GROUP_CONCAT JSON string to array
    const processedPosts = (posts || []).map((post) => {
      if (post.hatar_sessions && typeof post.hatar_sessions === "string") {
        try {
          // Split by || and parse each JSON object
          const sessionsArray = post.hatar_sessions
            .split("||")
            .filter((s) => s && s !== "null")
            .map((jsonStr) => JSON.parse(jsonStr));
          post.hatar_sessions = sessionsArray.length > 0 ? sessionsArray : null;
        } catch (e) {
          console.error("Error parsing hatar_sessions:", e);
          post.hatar_sessions = null;
        }
      }
      return post;
    });

    // Get total count with same filters
    const totalResult = await executeQuerySingle(
      `SELECT COUNT(*) as total 
       FROM posts p 
       WHERE ${whereClause}`,
      queryParams
    );

    const total = totalResult ? totalResult.total : 0;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      posts: processedPosts,
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
      [
        postId,
        !!(
          req.user &&
          (req.user.role === "admin" || req.user.role === "moderator")
        ),
      ]
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

    // Get family members
    const familyMembers = await executeQuery(
      "SELECT * FROM family_members WHERE post_id = ? ORDER BY sort_order, id",
      [postId]
    );

    // Get hatar sessions
    const hatarSessions = await executeQuery(
      "SELECT * FROM hatar_sessions WHERE post_id = ? ORDER BY sort_order, session_date, session_time_start",
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
        family_members: familyMembers,
        hatar_sessions: hatarSessions,
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
    console.log("POST /api/posts received:", req.body);

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
      hatar_sessions = [],
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

    // Insert hatar sessions if provided
    if (hatar_sessions && hatar_sessions.length > 0) {
      for (let i = 0; i < hatar_sessions.length; i++) {
        const session = hatar_sessions[i];
        if (session.session_date && session.session_location) {
          await executeQuery(
            "INSERT INTO hatar_sessions (post_id, session_date, session_time_start, session_time_end, session_location, session_note, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              postId,
              session.session_date,
              session.session_time_start || null,
              session.session_time_end || null,
              session.session_location,
              session.session_note || null,
              i + 1,
            ]
          );
        }
      }
    }

    // Send notification to admins (non-blocking)
    const admins = await executeQuery(
      "SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL"
    );

    const userInfo = await executeQuerySingle(
      "SELECT username FROM users WHERE id = ?",
      [userId]
    );

    admins.forEach((admin) => {
      sendAdminPendingPostNotification(admin.email, {
        id: postId,
        deceased_name,
        author_username: userInfo.username,
        location: burial_location,
        created_at: new Date(),
      }).catch((err) =>
        console.error("Failed to send admin notification:", err)
      );
    });

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
