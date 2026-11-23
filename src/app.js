const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const { API_PREFIX, CORS_ORIGIN } = require('./config/env');
const { notFound, errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: true, // Reflect request origin to support localhost:3000, 3001, 3002, 127.0.0.1
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id', 'x-user-name', 'x-user-email']
}));

// Request Logging
app.use(morgan('dev'));

// Body Parser with generous limit for high-res product photos
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// Base Welcome Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Amba Lifestyle API',
    version: '1.0.0',
    documentation: `${API_PREFIX}/health`
  });
});

// Main API Routes
app.use(API_PREFIX, routes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

module.exports = app;

