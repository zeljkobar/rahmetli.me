require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const { testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Previše zahtjeva sa ove IP adrese. Pokušajte ponovo za 15 minuta.'
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://rahmetli.me', 'https://www.rahmetli.me']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (frontend)
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cemeteries', require('./routes/cemeteries'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// Serve frontend for SPA routing (catch-all)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'Duplikat podataka. Molimo provjerite unos.'
        });
    }
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Neispravni podaci',
            details: error.message
        });
    }
    
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Nevaži token. Molimo prijavite se ponovo.'
        });
    }
    
    res.status(500).json({
        error: 'Interna greška servera',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Došlo je do greške'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Stranica nije pronađena'
    });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        await testConnection();
        
        app.listen(PORT, () => {
            console.log(`🚀 Server je pokrenuo na portu ${PORT}`);
            console.log(`🌍 Frontend: http://localhost:${PORT}`);
            console.log(`🔗 API: http://localhost:${PORT}/api`);
            console.log(`📊 Health: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Greška pri pokretanju servera:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔄 Zatvaranje servera...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔄 Zatvaranje servera...');
    process.exit(0);
});

startServer();