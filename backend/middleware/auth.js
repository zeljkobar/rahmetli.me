import { verifyToken } from "../config/auth.js";
import { executeQuerySingle } from "../config/database.js";

// Authentication middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: "Nedostaje token. Molimo prijavite se.",
    });
  }

  try {
    const decoded = verifyToken(token);

    // Get user from database
    const user = await executeQuerySingle(
      "SELECT id, username, email, role, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (!user || !user.is_active) {
      return res.status(401).json({
        error: "Nevaži token ili je korisnik deaktiviran.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({
      error: "Nevaži token. Molimo prijavite se ponovo.",
    });
  }
}

// Optional authentication (for endpoints that work with or without auth)
async function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    try {
      const decoded = verifyToken(token);
      const user = await executeQuerySingle(
        "SELECT id, username, email, role, is_active FROM users WHERE id = ? AND is_active = 1",
        [decoded.id]
      );

      if (user) {
        req.user = user;
      }
    } catch (error) {
      // Continue without user if token is invalid
      console.log("Invalid token in optional auth:", error.message);
    }
  }

  next();
}

// Role-based authorization
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Potrebna je prijava.",
      });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: "Nemate dozvolu za ovu akciju.",
      });
    }

    next();
  };
}

// Admin only middleware
const requireAdmin = requireRole(["admin"]);

// Moderator or admin middleware
const requireModerator = requireRole(["admin", "moderator"]);

// Owner or admin middleware (for user-specific resources)
function requireOwnerOrAdmin(userIdField = "user_id") {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: "Potrebna je prijava.",
      });
    }

    const userId = req.user.id;
    const userRole = req.user.role;
    const resourceUserId = req.body[userIdField] || req.params[userIdField];

    // Admin can access everything
    if (userRole === "admin") {
      return next();
    }

    // User can only access their own resources
    if (userId === parseInt(resourceUserId)) {
      return next();
    }

    return res.status(403).json({
      error: "Nemate dozvolu za ovu akciju.",
    });
  };
}

export {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireOwnerOrAdmin,
};
