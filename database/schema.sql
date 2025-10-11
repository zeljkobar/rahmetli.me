-- Rahmetli.me Database Schema
-- MySQL Database for Islamic Memorial Portal

-- Create database
CREATE DATABASE IF NOT EXISTS rahmetli_me CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rahmetli_me;

-- Users table
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
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7), -- hex color
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cemeteries/Mezaristani table
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
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts table (dženaze, dove, pomeni, hatme)
CREATE TABLE posts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    category_id INT,
    cemetery_id INT,
    
    -- Post info
    type ENUM('dzenaza', 'dova', 'pomen', 'hatma', 'godisnjica') NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    
    -- Deceased info
    deceased_name VARCHAR(100) NOT NULL,
    deceased_father_name VARCHAR(50),
    deceased_birth_date DATE,
    deceased_death_date DATE NOT NULL,
    deceased_age INT,
    
    -- Location & timing
    location VARCHAR(100),
    dzamija VARCHAR(100),
    dzenaza_time TIMESTAMP NULL,
    sahrana_time TIMESTAMP NULL,
    
    -- Meta
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejection_reason TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP,
    views_count INT DEFAULT 0,
    
    -- SEO
    slug VARCHAR(200) UNIQUE,
    meta_description VARCHAR(160),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (cemetery_id) REFERENCES cemeteries(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_type (type),
    INDEX idx_deceased_death_date (deceased_death_date),
    INDEX idx_status (status),
    INDEX idx_location (location),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_search (deceased_name, title, content)
);

-- Post images table
CREATE TABLE post_images (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    alt_text VARCHAR(255),
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Comments/Saučešća table
CREATE TABLE comments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    post_id INT,
    user_id INT,
    author_name VARCHAR(100),
    author_email VARCHAR(100),
    content TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    is_anonymous BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Favorites/Bookmarks table
CREATE TABLE user_favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    post_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    UNIQUE KEY unique_favorite (user_id, post_id)
);

-- Newsletter subscriptions
CREATE TABLE newsletter_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100),
    location VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    subscription_token VARCHAR(255),
    subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL
);

-- Settings table
CREATE TABLE settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default categories
INSERT INTO categories (name, slug, description, icon, color, display_order) VALUES
('Dženaza', 'dzenaza', 'Obavještenja o smrti i dženaza namazu', '🕌', '#2d5016', 1),
('Saučešće', 'saucesca', 'Dove i saučešća porodicama', '🤲', '#1e40af', 2),
('Pomen', 'pomen', 'Komemorativni skupovi i pomeni', '📅', '#7c3aed', 3),
('Hatma', 'hatma', 'Hatma i mevlud obavještenja', '📖', '#dc2626', 4),
('Godišnjica', 'godisnjica', 'Godišnjice smrti', '🌹', '#059669', 5);

-- Insert default settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('site_name', 'Rahmetli.me', 'Naziv sajta'),
('site_description', 'Prvi bosanski portal za obavještenja o smrti i saučešća', 'Opis sajta'),
('contact_email', 'kontakt@rahmetli.me', 'Kontakt email'),
('contact_phone', '+387 33 000 000', 'Kontakt telefon'),
('posts_per_page', '12', 'Broj objava po stranici'),
('premium_post_price', '10', 'Cijena premium objave u EUR'),
('post_expiry_days', '30', 'Broj dana do isteka obične objave'),
('premium_expiry_days', '90', 'Broj dana do isteka premium objave'),
('auto_approve_posts', 'false', 'Automatski odobri objave'),
('allow_anonymous_comments', 'true', 'Dozvoli anonimne komentare');

-- Create sample cemetery
INSERT INTO cemeteries (name, city, municipality, address) VALUES
('Bare mezaristan', 'Sarajevo', 'Novi Grad', 'Bare bb, Sarajevo'),
('Kovači mezaristan', 'Sarajevo', 'Stari Grad', 'Kovači, Sarajevo'),
('Vlakovo mezaristan', 'Tuzla', 'Tuzla', 'Vlakovo, Tuzla');