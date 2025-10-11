const express = require('express');
const router = express.Router();
const { executeQuery, executeQuerySingle } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get user profile (public)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await executeQuerySingle(`
            SELECT 
                id, username, full_name, created_at,
                (SELECT COUNT(*) FROM posts WHERE user_id = ? AND status = 'approved') as posts_count
            FROM users 
            WHERE id = ? AND is_active = 1
        `, [id, id]);

        if (!user) {
            return res.status(404).json({
                error: 'Korisnik nije pronađen'
            });
        }

        // Get user's recent posts
        const recentPosts = await executeQuery(`
            SELECT 
                id, title, deceased_name, type, created_at
            FROM posts 
            WHERE user_id = ? AND status = 'approved'
            ORDER BY created_at DESC
            LIMIT 5
        `, [id]);

        res.json({
            user: {
                ...user,
                recentPosts
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju korisničkog profila'
        });
    }
});

// Get all users (admin only)
router.get('/', requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role } = req.query;
        const offset = (page - 1) * limit;

        let whereConditions = [];
        let params = [];

        if (search) {
            whereConditions.push('(username LIKE ? OR email LIKE ? OR full_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (role) {
            whereConditions.push('role = ?');
            params.push(role);
        }

        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

        const users = await executeQuery(`
            SELECT 
                u.id, u.username, u.email, u.full_name, u.role, 
                u.is_active, u.email_verified, u.last_login, u.created_at,
                COUNT(p.id) as posts_count
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            ${whereClause}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Get total count
        const totalResult = await executeQuerySingle(`
            SELECT COUNT(*) as total
            FROM users u
            ${whereClause}
        `, params);

        const total = totalResult.total;
        const totalPages = Math.ceil(total / limit);

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju korisnika'
        });
    }
});

// Update user role/status (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, is_active } = req.body;

        // Validate role
        if (role && !['user', 'moderator', 'admin'].includes(role)) {
            return res.status(400).json({
                error: 'Neispravna uloga'
            });
        }

        const user = await executeQuerySingle(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            return res.status(404).json({
                error: 'Korisnik nije pronađen'
            });
        }

        // Don't allow admin to deactivate themselves
        if (req.user.id === parseInt(id) && is_active === false) {
            return res.status(400).json({
                error: 'Ne možete deaktivirati svoj nalog'
            });
        }

        let updates = [];
        let params = [];

        if (role !== undefined) {
            updates.push('role = ?');
            params.push(role);
        }

        if (is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(is_active);
        }

        if (updates.length === 0) {
            return res.status(400).json({
                error: 'Nema podataka za ažuriranje'
            });
        }

        params.push(id);

        await executeQuery(`
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE id = ?
        `, params);

        res.json({
            message: 'Korisnik je uspješno ažuriran'
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({
            error: 'Greška pri ažuriranju korisnika'
        });
    }
});

// Delete user (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Don't allow admin to delete themselves
        if (req.user.id === parseInt(id)) {
            return res.status(400).json({
                error: 'Ne možete obrisati svoj nalog'
            });
        }

        const user = await executeQuerySingle(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (!user) {
            return res.status(404).json({
                error: 'Korisnik nije pronađen'
            });
        }

        // Instead of deleting, deactivate the user and anonymize data
        await executeQuery(`
            UPDATE users 
            SET 
                is_active = 0,
                email = CONCAT('deleted_', id, '@rahmetli.me'),
                username = CONCAT('deleted_user_', id),
                full_name = 'Obrisani korisnik',
                phone = NULL
            WHERE id = ?
        `, [id]);

        res.json({
            message: 'Korisnik je uspješno obrisan'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            error: 'Greška pri brisanju korisnika'
        });
    }
});

module.exports = router;