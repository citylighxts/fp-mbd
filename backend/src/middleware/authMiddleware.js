const jwt = require('jsonwebtoken');
require('dotenv').config();

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Dapatkan token dari header
            token = req.headers.authorization.split(' ')[1];

            // Verifikasi token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Lampirkan user dari token ke request
            req.user = decoded; // decoded akan berisi { user_id, role, iat, exp }
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Tidak diotorisasi, token gagal' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Tidak diotorisasi, tidak ada token' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Tidak diizinkan untuk mengakses rute ini' });
        }
        next();
    };
};

module.exports = { protect, authorizeRoles };
