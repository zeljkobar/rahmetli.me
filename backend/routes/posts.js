const express = require('express');
const router = express.Router();
const { executeQuery, executeQuerySingle } = require('../config/database');
const { authenticateToken, optionalAuth, requireModerator } = require('../middleware/auth');
const { validatePost, validateSearch, validateId } = require('../middleware/validation');

// Get all posts with filtering and pagination
router.get('/', validateSearch, optionalAuth, async (req, res) => {
    try {
        const { 
            q, 
            type, 
            location, 
            page = 1, 
            limit = 12,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereConditions = ['p.status = "approved"'];
        let params = [];

        // Build search conditions
        if (q) {
            whereConditions.push('MATCH(p.deceased_name, p.title, p.content) AGAINST(? IN BOOLEAN MODE)');
            params.push(q);
        }

        if (type) {
            whereConditions.push('p.type = ?');
            params.push(type);
        }

        if (location) {
            whereConditions.push('p.location LIKE ?');
            params.push(`%${location}%`);
        }

        // Only show non-expired posts
        whereConditions.push('(p.expires_at IS NULL OR p.expires_at > NOW())');

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        // Get posts with user and category info
        const posts = await executeQuery(`
            SELECT 
                p.*,
                u.username,
                u.full_name as author_name,
                c.name as category_name,
                c.slug as category_slug,
                cem.name as cemetery_name,
                cem.city as cemetery_city,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND status = 'approved') as comments_count
            FROM posts p
            LEFT JOIN users u ON p.user_id = u.id
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN cemeteries cem ON p.cemetery_id = cem.id
            ${whereClause}
            ORDER BY p.is_featured DESC, p.${sort} ${order}
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count for pagination
        const totalResult = await executeQuerySingle(`
            SELECT COUNT(*) as total
            FROM posts p
            ${whereClause}
        `, params);

        const total = totalResult.total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            posts,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Get posts error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju objava'
        });
    }
});

// Get single post by ID
router.get('/:id', validateId, optionalAuth, async (req, res) => {
    try {
        const postId = req.params.id;

        const post = await executeQuerySingle(`
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
            WHERE p.id = ? AND p.status = 'approved'
        `, [postId]);

        if (!post) {
            return res.status(404).json({
                error: 'Objava nije pronađena'
            });
        }

        // Increment view count
        await executeQuery(
            'UPDATE posts SET views_count = views_count + 1 WHERE id = ?',
            [postId]
        );

        // Get post images
        const images = await executeQuery(
            'SELECT * FROM post_images WHERE post_id = ? ORDER BY display_order',
            [postId]
        );

        // Get approved comments
        const comments = await executeQuery(`
            SELECT 
                c.*,
                u.username,
                u.full_name
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ? AND c.status = 'approved'
            ORDER BY c.created_at DESC
        `, [postId]);

        res.json({
            post: {
                ...post,
                images,
                comments
            }
        });

    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju objave'
        });
    }
});

// Create new post
router.post('/', authenticateToken, validatePost, async (req, res) => {
    try {
        const {
            type,
            title,
            content,
            deceased_name,
            deceased_father_name,
            deceased_birth_date,
            deceased_death_date,
            location,
            dzamija,
            dzenaza_time,
            sahrana_time,
            cemetery_id,
            category_id,
            is_premium = false
        } = req.body;

        const userId = req.user.id;

        // Generate slug
        const slug = `${deceased_name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;

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

        const result = await executeQuery(`
            INSERT INTO posts (
                user_id, category_id, cemetery_id, type, title, content,
                deceased_name, deceased_father_name, deceased_birth_date, 
                deceased_death_date, deceased_age, location, dzamija,
                dzenaza_time, sahrana_time, is_premium, expires_at, slug
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            userId, category_id || null, cemetery_id || null, type, title, content,
            deceased_name, deceased_father_name || null, deceased_birth_date || null,
            deceased_death_date, deceased_age, location || null, dzamija || null,
            dzenaza_time || null, sahrana_time || null, is_premium, expiresAt, slug
        ]);

        res.status(201).json({
            message: 'Objava je uspješno kreirana',
            post_id: result.insertId,
            status: 'pending'
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            error: 'Greška pri kreiranju objave'
        });
    }
});

// Update post (only by owner or admin)
router.put('/:id', authenticateToken, validateId, validatePost, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if user owns the post or is admin
        const existingPost = await executeQuerySingle(
            'SELECT user_id, status FROM posts WHERE id = ?',
            [postId]
        );

        if (!existingPost) {
            return res.status(404).json({
                error: 'Objava nije pronađena'
            });
        }

        if (existingPost.user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({
                error: 'Nemate dozvolu za ažuriranje ove objave'
            });
        }

        // Reset status to pending if content is modified
        const status = userRole === 'admin' ? existingPost.status : 'pending';

        const {
            type, title, content, deceased_name, deceased_father_name,
            deceased_birth_date, deceased_death_date, location, dzamija,
            dzenaza_time, sahrana_time, cemetery_id, category_id
        } = req.body;

        await executeQuery(`
            UPDATE posts SET 
                category_id = ?, cemetery_id = ?, type = ?, title = ?, content = ?,
                deceased_name = ?, deceased_father_name = ?, deceased_birth_date = ?,
                deceased_death_date = ?, location = ?, dzamija = ?,
                dzenaza_time = ?, sahrana_time = ?, status = ?
            WHERE id = ?
        `, [
            category_id || null, cemetery_id || null, type, title, content,
            deceased_name, deceased_father_name || null, deceased_birth_date || null,
            deceased_death_date, location || null, dzamija || null,
            dzenaza_time || null, sahrana_time || null, status, postId
        ]);

        res.json({
            message: 'Objava je uspješno ažurirana',
            status: status
        });

    } catch (error) {
        console.error('Update post error:', error);
        res.status(500).json({
            error: 'Greška pri ažuriranju objave'
        });
    }
});

// Delete post (only by owner or admin)
router.delete('/:id', authenticateToken, validateId, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        // Check if user owns the post or is admin
        const existingPost = await executeQuerySingle(
            'SELECT user_id FROM posts WHERE id = ?',
            [postId]
        );

        if (!existingPost) {
            return res.status(404).json({
                error: 'Objava nije pronađena'
            });
        }

        if (existingPost.user_id !== userId && userRole !== 'admin') {
            return res.status(403).json({
                error: 'Nemate dozvolu za brisanje ove objave'
            });
        }

        await executeQuery('DELETE FROM posts WHERE id = ?', [postId]);

        res.json({
            message: 'Objava je uspješno obrisana'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            error: 'Greška pri brisanju objave'
        });
    }
});

// Moderate post (admin/moderator only)
router.put('/:id/moderate', requireModerator, validateId, async (req, res) => {
    try {
        const postId = req.params.id;
        const { status, rejection_reason } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'Neispravna vrijednost statusa'
            });
        }

        await executeQuery(
            'UPDATE posts SET status = ?, rejection_reason = ? WHERE id = ?',
            [status, rejection_reason || null, postId]
        );

        res.json({
            message: `Objava je ${status === 'approved' ? 'odobrena' : 'odbijena'}`
        });

    } catch (error) {
        console.error('Moderate post error:', error);
        res.status(500).json({
            error: 'Greška pri moderaciji objave'
        });
    }
});

module.exports = router;