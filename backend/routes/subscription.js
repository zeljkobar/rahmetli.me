const express = require("express");
const router = express.Router();
const { executeQuery, executeQuerySingle } = require("../config/database");
const { authenticate } = require("../middleware/auth");

// Gradovi u Crnoj Gori za email notifikacije
const AVAILABLE_CITIES = [
  "Bar",
  "Podgorica",
  "Budva",
  "Herceg Novi",
  "Nikšić",
  "Cetinje",
  "Bijelo Polje",
  "Pljevlja",
  "Berane",
  "Ulcinj",
  "Kotor",
  "Rožaje",
  "Plav",
  "Mojkovac",
  "Kolašin",
  "Andrijevica",
  "Plužine",
  "Žabljak",
  "Šavnik",
  "Gusinje",
  "Petnjica",
];

/**
 * GET /api/subscription/status
 * Vraća status pretplate za trenutno prijavljenog korisnika
 */
router.get("/status", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await executeQuerySingle(
      `SELECT 
        subscription_status,
        subscription_start,
        subscription_end,
        notification_cities,
        DATEDIFF(subscription_end, CURDATE()) as days_remaining
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: "Korisnik nije pronađen" });
    }

    const hasActiveSubscription = user.subscription_status === "active";
    const notificationCities = user.notification_cities
      ? JSON.parse(user.notification_cities)
      : [];

    res.json({
      hasActiveSubscription,
      status: user.subscription_status,
      startDate: user.subscription_start,
      endDate: user.subscription_end,
      daysRemaining: user.days_remaining || 0,
      notificationCities,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    res.status(500).json({ error: "Greška pri učitavanju statusa pretplate" });
  }
});

/**
 * POST /api/subscription/create
 * Kreira pending subscription i čuva gradove za notifikacije
 */
router.post("/create", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationCities } = req.body;

    // Validacija gradova
    if (!notificationCities || !Array.isArray(notificationCities)) {
      return res.status(400).json({
        error: "Morate izabrati najmanje jedan grad za notifikacije",
      });
    }

    // Provjeri da li su svi gradovi validni
    const invalidCities = notificationCities.filter(
      (city) => !AVAILABLE_CITIES.includes(city)
    );
    if (invalidCities.length > 0) {
      return res.status(400).json({
        error: `Nevažeći gradovi: ${invalidCities.join(", ")}`,
      });
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    // Formatiraj datume za MySQL
    const formatDate = (date) => date.toISOString().split("T")[0];

    // Kreiraj pending subscription
    const result = await executeQuery(
      `INSERT INTO subscriptions 
        (user_id, start_date, end_date, status, price, currency, plan_type) 
      VALUES (?, ?, ?, 'pending', 15.00, 'EUR', 'yearly')`,
      [userId, formatDate(startDate), formatDate(endDate)]
    );

    const subscriptionId = result.insertId;

    // Sačuvaj gradove u users tabelu
    await executeQuery(
      `UPDATE users 
      SET notification_cities = ? 
      WHERE id = ?`,
      [JSON.stringify(notificationCities), userId]
    );

    res.json({
      success: true,
      subscriptionId,
      message:
        "Pretplata kreirana. Molimo izvršite uplatu da aktivirate pristup.",
      paymentInfo: {
        amount: 15.0,
        currency: "EUR",
        reference: `SUB-${subscriptionId}`,
        // Ovdje će doći informacije za kartično plaćanje
      },
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: "Greška pri kreiranju pretplate" });
  }
});

/**
 * GET /api/subscription/cities
 * Vraća listu dostupnih gradova
 */
router.get("/cities", (req, res) => {
  res.json({
    cities: AVAILABLE_CITIES,
  });
});

/**
 * GET /api/subscription/check-comment-access
 * Provjerava da li korisnik može ostavljati komentare/hatare
 */
router.get("/check-comment-access", authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await executeQuerySingle(
      `SELECT subscription_status, subscription_end 
      FROM users 
      WHERE id = ?`,
      [userId]
    );

    const hasAccess = user.subscription_status === "active";

    res.json({
      hasAccess,
      status: user.subscription_status,
      message: hasAccess
        ? "Možete izjavljivati hatare"
        : "Potrebna je aktivna pretplata za izjavljivanje hatara",
    });
  } catch (error) {
    console.error("Error checking comment access:", error);
    res.status(500).json({ error: "Greška pri provjeri pristupa" });
  }
});

module.exports = router;
