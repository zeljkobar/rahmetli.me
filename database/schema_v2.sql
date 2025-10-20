-- ============================================
-- Rahmetli.me Database Schema v2.0
-- MySQL Database for Islamic Memorial Portal  
-- Updated schema with structured approach
-- ============================================

-- Create database
CREATE DATABASE IF NOT EXISTS rahmetli_me CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rahmetli_me;

-- Drop existing tables if they exist (for clean reinstall)
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS family_members;
DROP TABLE IF EXISTS hatar_sessions;
DROP TABLE IF EXISTS post_images;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS cemeteries;
DROP TABLE IF EXISTS categories; 
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('user', 'moderator', 'admin') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_slug (slug),
    INDEX idx_active (is_active),
    INDEX idx_order (display_order)
) ENGINE=InnoDB;

-- ============================================
-- 3. CEMETERIES TABLE 
-- ============================================
CREATE TABLE cemeteries (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    municipality VARCHAR(50),
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    contact_phone VARCHAR(20),
    contact_person VARCHAR(100),
    working_hours VARCHAR(100),
    description TEXT,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    posts_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_city (city),
    INDEX idx_name (name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB;

-- ============================================
-- 4. POSTS TABLE (Glavni sadržaj)
-- ============================================
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    category_id INT,
    cemetery_id INT,
    
    -- Osnovni podaci o preminulom
    deceased_name VARCHAR(255) NOT NULL,
    deceased_birth_date DATE,
    deceased_death_date DATE NOT NULL,
    deceased_age INT,
    deceased_photo_url VARCHAR(500),
    
    -- Dženaza informacije
    dzenaza_date DATE NOT NULL,
    dzenaza_time TIME NOT NULL,
    dzenaza_location VARCHAR(255) NOT NULL, -- "IKC Bar", "Islamski centar"
    
    -- Ukop informacije
    burial_cemetery VARCHAR(255) NOT NULL, -- "Belveder", "Gusta-Bar"
    burial_location VARCHAR(255), -- dodatna lokacija na groblju
    
    -- Generisani i custom sadržaj
    generated_html LONGTEXT, -- Auto-generirani template
    custom_html LONGTEXT, -- User-edited verzija
    is_custom_edited BOOLEAN DEFAULT FALSE,
    
    -- Status i meta
    status ENUM('draft', 'pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    
    -- Premium opcije
    is_premium BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    
    -- Statistike
    views_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    
    -- SEO
    slug VARCHAR(200) UNIQUE,
    meta_description VARCHAR(160),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (cemetery_id) REFERENCES cemeteries(id) ON DELETE SET NULL,
    
    -- Indexes za pretrage
    INDEX idx_deceased_name (deceased_name),
    INDEX idx_deceased_death_date (deceased_death_date),
    INDEX idx_dzenaza_date (dzenaza_date),
    INDEX idx_burial_cemetery (burial_cemetery),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_featured (is_featured),
    INDEX idx_city_date (dzenaza_location, dzenaza_date),
    
    -- Full-text search
    FULLTEXT idx_search (deceased_name, dzenaza_location, burial_cemetery)
) ENGINE=InnoDB;

-- ============================================
-- 5. HATAR SESSIONS (Više dana hatara)
-- ============================================
CREATE TABLE hatar_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    session_date DATE NOT NULL,
    session_time_start TIME NOT NULL,
    session_time_end TIME,
    session_location VARCHAR(255) NOT NULL, -- "gasulhana Dobra Voda", "IKC Bar"
    session_note VARCHAR(255), -- "prvi dan", "drugi dan", itd.
    sort_order INT DEFAULT 1,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    INDEX idx_post_date (post_id, session_date),
    INDEX idx_session_date (session_date),
    INDEX idx_location (session_location)
) ENGINE=InnoDB;

-- ============================================
-- 6. FAMILY MEMBERS (Ožalošćeni)
-- ============================================
CREATE TABLE family_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    relationship VARCHAR(100) NOT NULL, -- "supruga", "sin", "kćerka", "brat"
    name VARCHAR(255) NOT NULL,
    sort_order INT DEFAULT 1,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    INDEX idx_post_id (post_id),
    INDEX idx_relationship (relationship)
) ENGINE=InnoDB;

-- ============================================
-- 7. POST IMAGES (Slike objava)
-- ============================================
CREATE TABLE post_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    alt_text VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE, -- glavna slika
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    
    INDEX idx_post_id (post_id),
    INDEX idx_primary (is_primary)
) ENGINE=InnoDB;

-- ============================================
-- 8. COMMENTS/SAUČEŠĆA
-- ============================================
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT,
    parent_id INT, -- za odgovore na komentare
    
    -- Podaci autora (za anonimne komentare)
    author_name VARCHAR(100),
    author_email VARCHAR(100),
    author_phone VARCHAR(20),
    
    content TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    is_anonymous BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    
    INDEX idx_post_id (post_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_parent (parent_id)
) ENGINE=InnoDB;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Default kategorije
INSERT INTO categories (name, slug, description, icon, color, display_order) VALUES
('Dženaza', 'dzenaza', 'Obavještenja o smrti i dženaza namazu', '🕌', '#006233', 1),
('Saučešće', 'saucesca', 'Dove i saučešća porodicama', '🤲', '#2c5f41', 2),
('Pomen', 'pomen', 'Komemorativni skupovi i pomeni', '📅', '#00a651', 3),
('Hatma', 'hatma', 'Hatma i mevlud obavještenja', '📖', '#4f8a6b', 4);

-- Osnovna groblja
INSERT INTO cemeteries (name, city, municipality, address, is_active) VALUES
('Belveder', 'Bar', 'Bar', 'Belveder bb, Bar', TRUE),
('Gusta', 'Bar', 'Bar', 'Gusta bb, Bar', TRUE),
('Gusta-Zaljevo', 'Zaljevo', 'Bar', 'Zaljevo bb', TRUE),
('IKC Bar', 'Bar', 'Bar', 'Islamski kulturni centar, Bar', TRUE),
('Gasulhana Dobra Voda', 'Dobra Voda', 'Bar', 'Dobra Voda bb', TRUE);

-- Admin korisnik (password: admin123!)
INSERT INTO users (username, email, password_hash, full_name, role, is_active, email_verified) VALUES
('admin', 'admin@rahmetli.me', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin', TRUE, TRUE);

-- ============================================
-- VIEWS FOR EASY QUERIES
-- ============================================

-- View za kompletne objave sa svim podacima
CREATE VIEW posts_complete AS
SELECT 
    p.*,
    u.username as author_username,
    u.full_name as author_name,
    c.name as category_name,
    c.color as category_color,
    cem.name as cemetery_name,
    cem.city as cemetery_city,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND status = 'approved') as comments_count,
    (SELECT COUNT(*) FROM hatar_sessions WHERE post_id = p.id) as hatar_sessions_count
FROM posts p
LEFT JOIN users u ON p.user_id = u.id
LEFT JOIN categories c ON p.category_id = c.id  
LEFT JOIN cemeteries cem ON p.cemetery_id = cem.id;

-- View za današnje dženaze
CREATE VIEW todays_dzenaza AS
SELECT * FROM posts_complete 
WHERE dzenaza_date = CURDATE() 
AND status = 'approved'
ORDER BY dzenaza_time;

-- View za najnovije objave
CREATE VIEW recent_posts AS
SELECT * FROM posts_complete
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 50;

-- ============================================
-- STORED PROCEDURES
-- ============================================

DELIMITER //

-- Procedura za kreiranje slug-a
CREATE PROCEDURE GenerateSlug(IN deceased_name VARCHAR(255), IN death_date DATE, OUT result_slug VARCHAR(200))
BEGIN
    DECLARE base_slug VARCHAR(200);
    DECLARE counter INT DEFAULT 1;
    DECLARE temp_slug VARCHAR(200);
    
    -- Kreiraj osnovni slug
    SET base_slug = CONCAT(
        LOWER(REPLACE(REPLACE(deceased_name, ' ', '-'), 'ć', 'c')),
        '-',
        DATE_FORMAT(death_date, '%Y-%m-%d')
    );
    
    SET temp_slug = base_slug;
    
    -- Proveri jedinstvenost
    WHILE EXISTS(SELECT 1 FROM posts WHERE slug = temp_slug) DO
        SET counter = counter + 1;
        SET temp_slug = CONCAT(base_slug, '-', counter);
    END WHILE;
    
    SET result_slug = temp_slug;
END //

-- Procedura za ažuriranje brojača
CREATE PROCEDURE UpdateCounters()
BEGIN
    -- Ažuriraj brojač objava po kategorijama
    UPDATE categories c 
    SET posts_count = (
        SELECT COUNT(*) FROM posts p 
        WHERE p.category_id = c.id AND p.status = 'approved'
    );
    
    -- Ažuriraj brojač objava po grobljima
    UPDATE cemeteries cem
    SET posts_count = (
        SELECT COUNT(*) FROM posts p 
        WHERE p.cemetery_id = cem.id AND p.status = 'approved'
    );
    
    -- Ažuriraj brojač objava po korisnicima
    UPDATE users u
    SET posts_count = (
        SELECT COUNT(*) FROM posts p 
        WHERE p.user_id = u.id AND p.status = 'approved'
    );
END //

DELIMITER ;

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger za automatsko kreiranje slug-a
DELIMITER //
CREATE TRIGGER posts_before_insert 
BEFORE INSERT ON posts
FOR EACH ROW 
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        CALL GenerateSlug(NEW.deceased_name, NEW.deceased_death_date, @new_slug);
        SET NEW.slug = @new_slug;
    END IF;
END //
DELIMITER ;

-- ============================================
-- SAMPLE DATA (za testiranje)
-- ============================================

-- Test objava
INSERT INTO posts (
    user_id, category_id, cemetery_id,
    deceased_name, deceased_death_date, deceased_age,
    dzenaza_date, dzenaza_time, dzenaza_location,
    burial_cemetery, status
) VALUES (
    1, 1, 1,
    'Alija (Isa) KURTOVIĆ', '2025-09-17', 77,
    '2025-09-18', '15:00:00', 'gasulhana Dobra Voda',
    'Gusta-Zaljevo', 'approved'
);

-- Hatar sesije za test objavu
INSERT INTO hatar_sessions (post_id, session_date, session_time_start, session_time_end, session_location, sort_order) VALUES
(1, '2025-09-17', '19:00:00', NULL, 'gasulhana Dobra Voda', 1),
(1, '2025-09-18', '09:00:00', '15:00:00', 'gasulhana Dobra Voda', 2);

-- Porodica za test objavu
INSERT INTO family_members (post_id, relationship, name, sort_order) VALUES
(1, 'supruga', 'Remzija', 1),
(1, 'sin', 'Nedžad', 2),
(1, 'sin', 'Senad', 3),
(1, 'snaha', 'Medina', 4),
(1, 'unučad', 'Berin i Džejla', 5);

-- Pozovi proceduru za ažuriranje brojača
CALL UpdateCounters();

-- ============================================
-- 9. DONATIONS SYSTEM (Jednostavne donacije za sajt) 🤲
-- ============================================

-- Jednostavne donacije za održavanje sajta
CREATE TABLE donations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    
    -- Ko donira (može biti anonimno)
    user_id INT NULL, -- registrirani korisnik
    donor_name VARCHAR(100) NULL, -- ime za anonimne donacije
    donor_email VARCHAR(100) NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    
    -- Donacija podaci  
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Razlog donacije
    donation_type ENUM('post_creation', 'comment_posting', 'general_support') NOT NULL,
    related_post_id INT NULL, -- ako je zbog objave
    related_comment_id INT NULL, -- ako je zbog komentara
    
    -- Payment gateway
    payment_method ENUM('paypal', 'stripe') NOT NULL,
    payment_id VARCHAR(255) NULL, -- transaction ID
    payment_status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    payment_date TIMESTAMP NULL,
    
    -- Opciona poruka
    message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_post_id) REFERENCES posts(id) ON DELETE SET NULL,
    FOREIGN KEY (related_comment_id) REFERENCES comments(id) ON DELETE SET NULL,
    
    INDEX idx_user_id (user_id),
    INDEX idx_type (donation_type),
    INDEX idx_status (payment_status),
    INDEX idx_amount (amount),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- Predefinisani iznosi donacija
INSERT INTO donations (donor_name, amount, donation_type, payment_status, message) VALUES 
('Test donator', 5.00, 'general_support', 'completed', 'Za održavanje sajta - barakallahu'),
('Anoniman', 10.00, 'post_creation', 'completed', 'Sadaka za rahmetlije');

-- Simple view za ukupne donacije  
CREATE VIEW total_donations AS
SELECT 
    COUNT(*) as total_count,
    SUM(amount) as total_raised,
    AVG(amount) as average_amount,
    donation_type,
    DATE_FORMAT(created_at, '%Y-%m') as month_year
FROM donations 
WHERE payment_status = 'completed'
GROUP BY donation_type, DATE_FORMAT(created_at, '%Y-%m')
ORDER BY month_year DESC;

-- ============================================
-- KONEC SCHEMA SA DONACIJSKIM SISTEMOM
-- ============================================