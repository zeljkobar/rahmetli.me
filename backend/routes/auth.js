const express = require('express');
const router = express.Router();
const { executeQuery, executeQuerySingle } = require('../config/database');
const { generateToken, hashPassword, comparePassword, generateRandomToken } = require('../config/auth');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

// Register new user
router.post('/register', validateUserRegistration, async (req, res) => {
    try {
        const { username, email, password, full_name, phone } = req.body;

        // Check if user already exists
        const existingUser = await executeQuerySingle(
            'SELECT id FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUser) {
            return res.status(409).json({
                error: 'Korisnik sa ovim email-om ili korisničkim imenom već postoji'
            });
        }

        // Hash password
        const password_hash = await hashPassword(password);
        
        // Generate verification token
        const verification_token = generateRandomToken();

        // Insert new user
        const result = await executeQuery(
            `INSERT INTO users (username, email, password_hash, full_name, phone, verification_token) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [username, email, password_hash, full_name, phone || null, verification_token]
        );

        // Generate JWT token
        const token = generateToken({
            id: result.insertId,
            username,
            email,
            role: 'user'
        });

        res.status(201).json({
            message: 'Registracija uspješna',
            token,
            user: {
                id: result.insertId,
                username,
                email,
                full_name,
                role: 'user'
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Greška pri registraciji'
        });
    }
});

// Login user
router.post('/login', validateUserLogin, async (req, res) => {
    try {
        const { email_or_username, password } = req.body;

        // Find user by email or username
        const user = await executeQuerySingle(
            'SELECT * FROM users WHERE email = ? OR username = ? AND is_active = 1',
            [email_or_username, email_or_username]
        );

        if (!user) {
            return res.status(401).json({
                error: 'Neispravni podaci za prijavu'
            });
        }

        // Check password
        const isValidPassword = await comparePassword(password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Neispravni podaci za prijavu'
            });
        }

        // Update last login
        await executeQuery(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [user.id]
        );

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });

        res.json({
            message: 'Prijava uspješna',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Greška pri prijavi'
        });
    }
});

// Get current user profile
router.get('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const user = await executeQuerySingle(
            `SELECT id, username, email, full_name, phone, role, 
                    email_verified, last_login, created_at 
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (!user) {
            return res.status(404).json({
                error: 'Korisnik nije pronađen'
            });
        }

        res.json({
            user
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            error: 'Greška pri dohvatanju profila'
        });
    }
});

// Update user profile
router.put('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const { full_name, phone } = req.body;
        const userId = req.user.id;

        // Update user profile
        await executeQuery(
            'UPDATE users SET full_name = ?, phone = ? WHERE id = ?',
            [full_name, phone || null, userId]
        );

        res.json({
            message: 'Profil je uspješno ažuriran'
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Greška pri ažuriranju profila'
        });
    }
});

// Change password
router.put('/change-password', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const userId = req.user.id;

        // Get current password hash
        const user = await executeQuerySingle(
            'SELECT password_hash FROM users WHERE id = ?',
            [userId]
        );

        // Verify current password
        const isValidPassword = await comparePassword(current_password, user.password_hash);
        
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Trenutna lozinka nije ispravna'
            });
        }

        // Hash new password
        const new_password_hash = await hashPassword(new_password);

        // Update password
        await executeQuery(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [new_password_hash, userId]
        );

        res.json({
            message: 'Lozinka je uspješno promijenjena'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            error: 'Greška pri promjeni lozinke'
        });
    }
});

// Logout (client-side token removal)
router.post('/logout', (req, res) => {
    res.json({
        message: 'Uspješno ste se odjavili'
    });
});

module.exports = router;