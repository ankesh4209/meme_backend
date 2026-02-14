require('dotenv').config(); // Sabse upar dotenv load karein

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
    PORT: process.env.PORT || 5001,
    MONGODB_URI: isProduction
        ? process.env.MONGO_URI
        : 'mongodb://localhost:27017/MEME_DB',

    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',

    // Frontend URL (CORS ke liye zaroori hai)
    CLIENT_URL: isProduction
        ? 'https://www.pasameme.in'
        : 'http://localhost:5001'
};