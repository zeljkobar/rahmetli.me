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

// Post validation rules
const validatePost = [
  body("type")
    .isIn(["dzenaza", "dova", "pomen", "hatma", "godisnjica"])
    .withMessage("Neispravna vrsta objave"),

  body("title")
    .isLength({ min: 5, max: 200 })
    .withMessage("Naslov mora imati 5-200 karaktera")
    .trim(),

  body("content")
    .isLength({ min: 20, max: 5000 })
    .withMessage("Sadržaj mora imati 20-5000 karaktera")
    .trim(),

  body("deceased_name")
    .isLength({ min: 2, max: 100 })
    .withMessage("Ime pokojnog mora imati 2-100 karaktera")
    .trim(),

  body("deceased_death_date")
    .isISO8601()
    .withMessage("Neispravan datum smrti")
    .toDate(),

  body("deceased_birth_date")
    .optional()
    .isISO8601()
    .withMessage("Neispravan datum rođenja")
    .toDate(),

  body("location")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Lokacija može imati maksimalno 100 karaktera")
    .trim(),

  body("dzamija")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Naziv džamije može imati maksimalno 100 karaktera")
    .trim(),

  body("dzenaza_time")
    .optional()
    .isISO8601()
    .withMessage("Neispravan datum i vrijeme dženaze")
    .toDate(),

  body("sahrana_time")
    .optional()
    .isISO8601()
    .withMessage("Neispravan datum i vrijeme sahrane")
    .toDate(),

  handleValidationErrors,
];

// Comment validation rules
const validateComment = [
  body("post_id")
    .optional()
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
