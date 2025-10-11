# Rahmetli.me - Bosanski Portal za Obavještenja o Smrti

Rahmetli.me je prvi bosanski portal koji se bavi objavljivanjem obavještenja o smrti, saučešća i pomeni namijenjen muslimanskoj zajednici.

## 🚀 Funkcionalnosti

### Osnovne funkcionalnosti
- **Dženaze** - Obavještenja o smrti i dženaza namazu
- **Saučešća** - Dove i poruke saučešća porodicama
- **Pomeni** - Komemorativni skupovi i pomeni
- **Hatme** - Hatma i mevlud obavještenja
- **Mezaristani** - Direktorij mezaristana sa lokacijama

### Korisničke funkcionalnosti  
- Registracija i prijava korisnika
- Kreiranje i upravljanje objavama
- Pretražavanje objava po različitim kriterijima
- Komentiranje objava (saučešća)
- Lični profil i arhiva objava
- Notifikacije o novim objavama

### Admin funkcionalnosti
- Moderacija objava
- Upravljanje korisnicima
- Upravljanje kategorijama i mezaristanima
- Analitika i izvještaji

## 🛠️ Tehnologije

### Backend
- **Node.js** + **Express.js** - Server framework
- **MySQL** - Relacijska baza podataka
- **JWT** - Autentifikacija
- **bcrypt** - Hash lozinki
- **Express Validator** - Validacija podataka
- **Helmet** - Sigurnost
- **Rate Limiting** - Ograničavanje zahtjeva

### Frontend
- **Vanilla JavaScript** (ES6+) - Bez frameworka
- **CSS3** - Custom properties, Grid, Flexbox
- **Vite** - Build tool i dev server
- **Responsive Design** - Mobile-first pristup

### Development Tools
- **Nodemon** - Auto-restart servera
- **Concurrently** - Paralelno pokretanje
- **ESLint** - Code linting
- **Jest** - Unit testiranje

## 📦 Instalacija

### Preduvjeti
- Node.js (v18 ili noviji)
- MySQL (v8 ili noviji)
- npm ili yarn

### 1. Clone repozitorijuma
```bash
git clone https://github.com/yourusername/rahmetli-me.git
cd rahmetli-me
```

### 2. Instaliranje dependencies
```bash
npm install
```

### 3. Konfiguracija baze podataka
```bash
# Kreiraj MySQL bazu
mysql -u root -p -e "CREATE DATABASE rahmetli_me CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Importuj schema
mysql -u root -p rahmetli_me < database/schema.sql
```

### 4. Environment varijable
```bash
# Kopiraj example fajl
cp .env.example .env

# Edituj .env fajl sa svojim podacima
nano .env
```

Konfiguruj u `.env` fajlu:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rahmetli_me
JWT_SECRET=your-secret-key
```

### 5. Pokretanje aplikacije

#### Development mode
```bash
npm run dev
```

Ova komanda pokreće:
- Backend server na `http://localhost:3000`
- Frontend dev server na `http://localhost:5173`

#### Production mode
```bash
# Build aplikacije
npm run build

# Pokretanje production servera
npm start
```

## 📁 Struktura projekta

```
rahmetli-me/
├── backend/                 # Express.js backend
│   ├── config/             # Database i auth konfiguracija
│   ├── controllers/        # Business logika
│   ├── middleware/         # Auth, validation middleware
│   ├── models/            # Database modeli (opciono)
│   ├── routes/            # API rute
│   ├── utils/             # Helper funkcije
│   └── server.js          # Server entry point
├── frontend/              # Frontend aplikacija
│   ├── assets/           # CSS, JS, slike
│   │   ├── css/         # Stilovi
│   │   ├── js/          # JavaScript fajlovi
│   │   └── images/      # Slike
│   ├── components/       # Reusable komponente
│   ├── pages/           # Page komponente (opciono)
│   ├── utils/           # Helper funkcije
│   └── index.html       # Glavna HTML stranica
├── database/             # Database fajlovi
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Početni podaci
├── dist/                # Build output (auto-generated)
├── package.json         # NPM konfiguracija
├── vite.config.js       # Vite konfiguracija
└── README.md           # Ova dokumentacija
```

## 🔌 API Endpoints

### Autentifikacija
```
POST   /api/auth/register     # Registracija
POST   /api/auth/login        # Prijava
GET    /api/auth/profile      # Korisnički profil
PUT    /api/auth/profile      # Ažuriranje profila
POST   /api/auth/logout       # Odjava
```

### Objave
```
GET    /api/posts             # Lista objava (+ filtering)
GET    /api/posts/:id         # Pojedinačna objava
POST   /api/posts             # Nova objava (auth required)
PUT    /api/posts/:id         # Ažuriranje objave (owner/admin)
DELETE /api/posts/:id         # Brisanje objave (owner/admin)
```

### Kategorije
```
GET    /api/categories        # Lista kategorija
GET    /api/categories/:slug  # Kategorija po slug-u
```

### Mezaristani
```
GET    /api/cemeteries        # Lista mezaristana
GET    /api/cemeteries/:id    # Pojedinačan mezaristan
GET    /api/cemeteries/cities/list  # Lista gradova
```

### Korisnici (Admin)
```
GET    /api/users             # Lista korisnika (admin)
GET    /api/users/:id         # Korisnički profil (public)
PUT    /api/users/:id         # Ažuriranje korisnika (admin)
DELETE /api/users/:id         # Brisanje korisnika (admin)
```

## 📱 Frontend Struktura

### JavaScript Moduli

#### `utils/api.js`
API client za komunikaciju sa backend-om. Sadrži sve HTTP metode i handluje autentifikaciju.

#### `utils/helpers.js` 
Helper funkcije za datum formatiranje, validaciju, DOM manipulaciju, itd.

#### `components/AuthManager.js`
Upravljanje autentifikacijom korisnika i UI state-om.

#### `components/PostCard.js`
Komponenta za prikaz objava u grid layout-u.

#### `components/Pagination.js`
Komponenta za paginaciju rezultata.

#### `assets/js/app.js`
Glavna aplikacija koja koordiniše sve komponente i routing.

### CSS Arhitektura

Modularna CSS arhitektura:
- `reset.css` - CSS reset
- `variables.css` - CSS custom properties 
- `components.css` - Stilovi komponenti
- `layout.css` - Layout i grid sistemi
- `responsive.css` - Responsive stilovi

## 🔒 Sigurnost

### Backend sigurnost
- **Helmet.js** - HTTP sigurnosni headeri
- **Rate limiting** - Ograničavanje API zahtjeva
- **Input validation** - Express Validator
- **SQL injection zaštita** - Prepared statements
- **XSS zaštita** - Input sanitization
- **CORS konfiguracija** - Kontrola cross-origin zahtjeva

### Autentifikacija
- **JWT tokeni** - Stateless autentifikacija
- **bcrypt** - Password hashing
- **Secure cookies** - HttpOnly, Secure flagovi
- **Token expiration** - Automatski logout

### Frontend sigurnost
- **Input sanitization** - XSS prevencija
- **CSRF protection** - Token validacija
- **Secure communication** - HTTPS enforcing

## 🧪 Testiranje

### Unit testovi
```bash
npm test              # Pokreni sve testove
npm run test:watch    # Watch mode
```

### API testiranje
```bash
# Sa curl
curl -X GET http://localhost:3000/api/health

# Sa Postman
# Importuj Postman collection iz docs/
```

## 🚀 Deployment

### Production build
```bash
# Build aplikacije
npm run build

# Test production build lokalno
npm start
```

### Environment varijable za production
```env
NODE_ENV=production
PORT=80
DB_HOST=production-db-host
JWT_SECRET=secure-production-secret
```

### Server requirements
- Node.js v18+
- MySQL 8+
- Minimum 1GB RAM
- SSL certifikat za HTTPS

### Preporučene platforme
- **DigitalOcean Droplet** - Full control
- **Railway** - Easy deployment  
- **Heroku** - Simple PaaS
- **AWS EC2** - Scalable solution

## 📈 Performance

### Frontend optimizacije
- **Code splitting** - Lazy loading komponenti
- **Image optimization** - WebP format, lazy loading
- **CSS optimization** - Minification, critical CSS
- **Cache strategije** - Service Worker (future)

### Backend optimizacije
- **Database indexing** - Optimizovani upiti
- **Connection pooling** - MySQL pool
- **Response caching** - Redis (future)
- **Gzip compression** - Kompresija odgovora

## 🤝 Contributing

### Development workflow
1. Fork repozitorijum
2. Kreiraj feature branch (`git checkout -b feature/nova-funkcionalnost`)
3. Commit promjene (`git commit -am 'Dodana nova funkcionalnost'`)
4. Push na branch (`git push origin feature/nova-funkcionalnost`)
5. Otvori Pull Request

### Coding standards
- ESLint konfiguracija za JavaScript
- Komentarisanje složenih funkcija
- Testiranje novih funkcionalnosti
- Mobile-first CSS pristup

## 📄 Licenca

MIT License - vidi [LICENSE](LICENSE) fajl za detalje.

## 📞 Podrška

- **Email**: kontakt@rahmetli.me
- **GitHub Issues**: [Issues page](https://github.com/yourusername/rahmetli-me/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/rahmetli-me/wiki)

## 🔄 Changelog

### v1.0.0 (2025-01-01)
- Početna verzija
- Osnovne funkcionalnosti objava
- Autentifikacija korisnika
- Responsive design
- Admin panel

---

**Rahmetli.me** - U spomen na naše najmilije 🤲

*Allahu yerhamhum - Neka ih Allah miluje*