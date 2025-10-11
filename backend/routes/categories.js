const express = require('express');
const router = express.Router();
const { executeQuery, executeQuerySingle } = require('../config/database');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await executeQuery(`
            SELECT 
                c.*,
                COUNT(p.id) as posts_count
            FROM categories c
            LEFT JOIN posts p ON c.id = p.category_id AND p.status = 'approved'
            WHERE c.is_active = 1
            GROUP BY c.id
            ORDER BY c.display_order, c.name
        `);

        res.json({
            categories
        });

    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju kategorija'
        });
    }
});

// Get single category by slug
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const category = await executeQuerySingle(
            'SELECT * FROM categories WHERE slug = ? AND is_active = 1',
            [slug]
        );

        if (!category) {
            return res.status(404).json({
                error: 'Kategorija nije pronađena'
            });
        }

        res.json({
            category
        });

    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju kategorije'
        });
    }
});

module.exports = router;