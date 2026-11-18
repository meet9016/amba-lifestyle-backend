const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5005,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: process.env.API_PREFIX || '/api/v1',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/amba_lifestyle',
  JWT_SECRET: process.env.JWT_SECRET || 'super_secret_jwt_key_amba_lifestyle_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(item => item.trim()) 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']
};

