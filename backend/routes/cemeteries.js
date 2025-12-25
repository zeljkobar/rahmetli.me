import express from "express";
const router = express.Router();
import { executeQuery, executeQuerySingle } from "../config/database.js";

// Get all cemeteries
router.get("/", async (req, res) => {
  try {
    const { city, search } = req.query;

    let whereConditions = ["is_active = 1"];
    let params = [];

    if (city) {
      whereConditions.push("city = ?");
      params.push(city);
    }

    if (search) {
      whereConditions.push("(name LIKE ? OR city LIKE ? OR address LIKE ?)");
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause =
      whereConditions.length > 0
        ? "WHERE " + whereConditions.join(" AND ")
        : "";

    const cemeteries = await executeQuery(
      `
            SELECT 
                c.*,
                COUNT(p.id) as posts_count
            FROM cemeteries c
            LEFT JOIN posts p ON c.id = p.cemetery_id AND p.status = 'approved'
            ${whereClause}
            GROUP BY c.id
            ORDER BY c.city, c.name
        `,
      params
    );

    res.json({
      cemeteries,
    });
  } catch (error) {
    console.error("Get cemeteries error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju mezaristana",
    });
  }
});

// Get single cemetery
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const cemetery = await executeQuerySingle(
      "SELECT * FROM cemeteries WHERE id = ? AND is_active = 1",
      [id]
    );

    if (!cemetery) {
      return res.status(404).json({
        error: "Mezaristan nije pronađen",
      });
    }

    res.json({
      cemetery,
    });
  } catch (error) {
    console.error("Get cemetery error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju mezaristana",
    });
  }
});

// Get cities with cemeteries
router.get("/cities/list", async (req, res) => {
  try {
    const cities = await executeQuery(`
            SELECT 
                city,
                COUNT(*) as cemeteries_count
            FROM cemeteries 
            WHERE is_active = 1
            GROUP BY city
            ORDER BY city
        `);

    res.json({
      cities,
    });
  } catch (error) {
    console.error("Get cities error:", error);
    res.status(500).json({
      error: "Greška pri dohvatanju gradova",
    });
  }
});

// Get count of cemeteries that need review
router.get("/needs-review/count", async (req, res) => {
  try {
    const result = await executeQuery(
      "SELECT COUNT(*) as count FROM cemeteries WHERE needs_review = 1 AND is_active = 1"
    );

    res.json({
      count: result[0]?.count || 0,
    });
  } catch (error) {
    console.error("Get needs review count error:", error);
    res.status(500).json({
      error: "Greška pri brojanju mezaristana",
    });
  }
});

// Create new cemetery (basic info - public endpoint)
router.post("/", async (req, res) => {
  try {
    const { name, city } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({
        error: "Naziv mezaristana je obavezan",
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({
        error: "Grad je obavezan",
      });
    }

    // Check if cemetery already exists
    const existing = await executeQuerySingle(
      "SELECT id FROM cemeteries WHERE name = ? AND city = ? AND is_active = 1",
      [name.trim(), city.trim()]
    );

    if (existing) {
      return res.json({
        cemetery: existing,
        message: "Mezaristan već postoji",
      });
    }

    // Insert new cemetery with basic info
    const result = await executeQuery(
      `INSERT INTO cemeteries (name, city, is_active, needs_review) 
       VALUES (?, ?, 1, 1)`,
      [name.trim(), city.trim()]
    );

    const newCemetery = {
      id: result.insertId,
      name: name.trim(),
      city: city.trim(),
      address: null,
      latitude: null,
      longitude: null,
      description: null,
      is_active: 1,
    };

    res.status(201).json({
      cemetery: newCemetery,
      message: "Mezaristan uspješno dodat",
    });
  } catch (error) {
    console.error("Create cemetery error:", error);
    res.status(500).json({
      error: "Greška pri dodavanju mezaristana",
    });
  }
});

export default router;
