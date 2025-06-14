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
            req.user = decoded;
            
            // Lanjutkan ke middleware selanjutnya dan HENTIKAN eksekusi fungsi ini
            return next(); 

        } catch (error) {
            // Jika token gagal diverifikasi, kirim error dan HENTIKAN eksekusi
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ message: 'Tidak diotorisasi, token gagal' });
        }
    }

    return res.status(401).json({ message: 'Tidak diotorisasi, tidak ada token' });
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
