import { body, validationResult, param, query } from "express-validator";

// Generic validation error handler
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Neispravni podaci",
      details: errors.array(),
    });
  }
  next();
}

// User validation rules
const validateUserRegistration = [
  body("username")
    .isLength({ min: 3, max: 50 })
    .withMessage("Korisničko ime mora imati 3-50 karaktera")
    .matches(/^[a-zA-Z0-9._-]+$/)
    .withMessage(
      "Korisničko ime može sadržavati samo slova, brojevi, tačke, crtice i podvlake"
    ),

  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Neispravna email adresa"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Lozinka mora imati minimum 8 karaktera")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Lozinka mora sadržavati bar jedno malo slovo, veliko slovo i broj"
    ),

  body("full_name")
    .isLength({ min: 2, max: 100 })
    .withMessage("Ime i prezime mora imati 2-100 karaktera")
    .trim(),

  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Neispravan broj telefona"),

  handleValidationErrors,
];

const validateUserLogin = [
  body("email_or_username")
    .notEmpty()
    .withMessage("Email ili korisničko ime je obavezno"),

  body("password").notEmpty().withMessage("Lozinka je obavezna"),

  handleValidationErrors,
];

// Post validation rules - updated for actual database schema
const validatePost = [
  body("deceased_name")
    .isLength({ min: 2, max: 100 })
    .withMessage("Ime pokojnog mora imati 2-100 karaktera")
    .trim(),

  body("deceased_death_date").isDate().withMessage("Neispravan datum smrti"),

  body("deceased_birth_date")
    .optional()
    .isDate()
    .withMessage("Neispravan datum rođenja"),

  body("dzenaza_date")
    .optional()
    .isDate()
    .withMessage("Neispravan datum dženaze"),

  body("dzenaza_time")
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/)
    .withMessage("Neispravno vrijeme dženaze (HH:MM ili HH:MM:SS)"),

  body("dzenaza_location")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Lokacija dženaze može imati maksimalno 255 karaktera")
    .trim(),

  body("burial_cemetery")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Naziv groblja može imati maksimalno 255 karaktera")
    .trim(),

  body("category_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Neispravan ID kategorije")
    .toInt(),

  body("cemetery_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Neispravan ID groblja")
    .toInt(),

  handleValidationErrors,
];

// Comment validation rules
const validateComment = [
  body("post_id")
    .notEmpty()
    .withMessage("ID objave je obavezan")
    .isInt({ min: 1 })
    .withMessage("Neispravan ID objave")
    .toInt(),

  body("content")
    .isLength({ min: 5, max: 1000 })
    .withMessage("Komentar mora imati 5-1000 karaktera")
    .trim(),

  body("author_name")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Ime mora imati 2-100 karaktera")
    .trim(),

  body("author_email")
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage("Neispravna email adresa"),

  handleValidationErrors,
];

// Search validation rules
const validateSearch = [
  query("q")
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage("Pojam za pretragu mora imati 2-100 karaktera")
    .trim(),

  query("type")
    .optional()
    .isIn(["dzenaza", "dova", "pomen", "hatma", "godisnjica"])
    .withMessage("Neispravna vrsta objave"),

  query("location")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Lokacija može imati maksimalno 50 karaktera")
    .trim(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Broj stranice mora biti pozitivan broj")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit mora biti između 1 i 50")
    .toInt(),

  handleValidationErrors,
];

// ID parameter validation
const validateId = [
  param("id").isInt({ min: 1 }).withMessage("Neispravan ID").toInt(),

  handleValidationErrors,
];

export {
  handleValidationErrors,
  validateUserRegistration,
  validateUserLogin,
  validatePost,
  validateComment,
  validateSearch,
  validateId,
};
