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

export default router;
