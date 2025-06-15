const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
    console.log('[PROTECT] Dipanggil:', req.method, req.originalUrl); // Tambahkan log ini

    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            return next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Tidak diotorisasi, token gagal' });
        }
    }

    return res.status(401).json({ message: 'Tidak diotorisasi, tidak ada token' });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        console.log('[AUTHORIZE ROLES] Dipanggil:', req.method, req.originalUrl, 'Role user:', req.user?.role); // Tambahkan log ini
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Tidak diizinkan untuk mengakses rute ini' });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };
