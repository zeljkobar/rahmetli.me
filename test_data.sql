-- Insert test data for rahmetli.me

-- Insert test user
INSERT INTO users (username, email, password_hash, full_name, role, email_verified, created_at, updated_at) 
VALUES (
  'testuser', 
  'test@rahmetli.me', 
  '$2b$10$1234567890abcdefghijklmnopqrstuv', 
  'Test Korisnik', 
  'user', 
  1, 
  NOW(), 
  NOW()
) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id);

SET @user_id = LAST_INSERT_ID();

-- Insert test posts
INSERT INTO posts (
  user_id, deceased_name, deceased_death_date, deceased_age, deceased_photo_url,
  dzenaza_date, dzenaza_time, dzenaza_location, burial_cemetery, burial_location,
  generated_html, status, is_premium, is_featured, views_count, shares_count,
  created_at, updated_at
) VALUES 
(
  @user_id,
  'Marko Petrović',
  '2024-10-15',
  65,
  NULL,
  '2024-10-17',
  '14:00',
  'Begova džamija, Sarajevo',
  'Mezaristan Bare',
  'Sarajevo',
  '<p>Sa velikom tugom objavljujemo da je u 65. godini života preminuo naš dragi Marko Petrović. Bio je predani otac, suprug i prijatelj koji će ostati zauvek u našim srcima.</p><p>Dženaza će se održati u utorak, 17. oktobra u 14:00 sati u Begovoj džamiji u Sarajevu.</p><p>Sahrana će biti obavljena na mezaristanu Bare u Sarajevu.</p><p>Allahu rahmet, a porodici saučešće.</p>',
  'approved',
  0,
  1,
  25,
  3,
  '2024-10-16 10:30:00',
  '2024-10-16 10:30:00'
),
(
  @user_id,
  'Fatima Hodžić',
  '2024-10-10',
  78,
  NULL,
  '2024-10-12',
  '13:30',
  'Careva džamija, Sarajevo',
  'Mezaristan Alifakovac',
  'Sarajevo',
  '<p>Sa dubokom tugom obaveštavamo da je u 78. godini života preminula naša majka i baba Fatima Hodžić.</p><p>Bila je uzorna žena, majka petoro dece i baba devet unučadi. Ceo život je posvetila svojoj porodici i veri.</p><p>Dženaza će se održati u subotu, 12. oktobra u 13:30 sati u Carevoj džamiji.</p><p>Sahrana na Alifakovcu.</p><p>Allahu rahmet!</p>',
  'approved',
  0,
  0,
  18,
  2,
  '2024-10-11 09:15:00',
  '2024-10-11 09:15:00'
),
(
  @user_id,
  'Ahmed Begić',
  '2024-10-18',
  45,
  NULL,
  '2024-10-20',
  '15:00',
  'Gazi Husrev-begova džamija',
  'Mezaristan Kovači',
  'Sarajevo',
  '<p>Sa neizrecivom tugom objavljujemo da nas je u 45. godini života napustio Ahmed Begić.</p><p>Ostavio je suprugu i troje male dece. Bio je dobrosrdan čovek koji je pomagao svima oko sebe.</p><p>Dženaza će se održati u nedelju, 20. oktobra u 15:00 sati u Gazi Husrev-begovoj džamiji.</p><p>Sahrana na mezaristanu Kovači.</p><p>Inna lillahi wa inna ilayhi raji\'un.</p>',
  'approved',
  1,
  0,
  42,
  7,
  '2024-10-19 16:20:00',
  '2024-10-19 16:20:00'
),
(
  @user_id,
  'Zehra Muratović',
  '2024-10-05',
  89,
  NULL,
  '2024-10-07',
  '12:00',
  'Ali-pašina džamija, Sarajevo',
  'Mezaristan Bare',
  'Sarajevo',
  '<p>Sa velikim poštovanjem objavljujemo da je u dubokoj starosti preminula naša nana Zehra Muratović.</p><p>Imala je 89 godina punih života, blagoslova i mudnosti. Bila je stub porodice i uzor mnogim generacijama.</p><p>Dženaza je obavljena u ponedeljak, 7. oktobra u podne u Ali-pašinoj džamiji.</p><p>Allahu rahmet, džennet im mekan!</p>',
  'approved',
  0,
  0,
  31,
  5,
  '2024-10-06 08:45:00',
  '2024-10-06 08:45:00'
),
(
  @user_id,
  'Emin Softić',
  '2024-10-20',
  72,
  NULL,
  '2024-10-22',
  '13:00',
  'Ferhadija džamija',
  'Mezaristan Alifakovac',
  'Sarajevo',
  '<p>Obaveštavamo sve prijatelje i rodbinu da je danas preminuo Emin Softić u 72. godini života.</p><p>Bio je poštovan čovek, deda četvoro unučadi i veliki ljubitelj književnosti.</p><p>Dženaza će se održati u utorak, 22. oktobra u 13:00 sati u Ferhadija džamiji.</p><p>Sahrana na Alifakovcu.</p><p>Allahu rahmet!</p>',
  'approved',
  0,
  1,
  8,
  1,
  NOW(),
  NOW()
);

-- Insert some test comments
INSERT INTO comments (user_id, post_id, content, status, created_at, updated_at)
SELECT 
  @user_id,
  p.id,
  CASE p.deceased_name
    WHEN 'Marko Petrović' THEN 'Saučešće porodici. Marko je bio divan čovek, ostaće u lepom sećanju.'
    WHEN 'Fatima Hodžić' THEN 'Allahu rahmet teti Fatimi. Bila je kao majka svima nama u komšiluku.'
    WHEN 'Ahmed Begić' THEN 'Ne mogu da verujem... Ahmed je bio tako dobar prijatelj. Saučešće porodici.'
    ELSE 'Allahu rahmet. Saučešće porodici i prijateljima.'
  END,
  'approved',
  DATE_ADD(p.created_at, INTERVAL 2 HOUR),
  DATE_ADD(p.created_at, INTERVAL 2 HOUR)
FROM posts p
WHERE p.deceased_name IN ('Marko Petrović', 'Fatima Hodžić', 'Ahmed Begić')
LIMIT 3;

SELECT 'Test data inserted successfully!' as message;