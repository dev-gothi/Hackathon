const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { startCronJobs } = require('./services/cronService');
const { get } = require('./config/db');
const seed = require('./db/seed');

// Auto-seed initial demo dataset if database is freshly initialized
try {
  const userCount = get('SELECT COUNT(*) as count FROM users')?.count || 0;
  if (userCount === 0) {
    console.log('📦 Empty database detected. Auto-seeding initial demo data...');
    seed();
  }
} catch (e) {
  console.warn('Initial seed check notice:', e.message);
}

// Route imports
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const doseRoutes = require('./routes/doseRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const devRoutes = require('./routes/devRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Disable server fingerprinting
app.disable('x-powered-by');

// HTTP Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '500kb' }));

// In-memory sliding window rate limiter for auth endpoints (prevents brute force)
const authAttempts = new Map();
const rateLimitAuth = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 mins
  const maxAttempts = 30;

  let record = authAttempts.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    authAttempts.set(ip, record);
    return next();
  }

  record.count++;
  if (record.count > maxAttempts) {
    return res.status(429).json({
      error: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }
  next();
};

// Request logger for easy debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// API Routes
app.use('/api/auth', rateLimitAuth, authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api', medicationRoutes);
app.use('/api', doseRoutes);
app.use('/api', appointmentRoutes);
app.use('/api', checkinRoutes);
app.use('/api', analyticsRoutes);
app.use('/api/dev', devRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Elderly Care Platform Backend'
  });
});

const path = require('path');
const fs = require('fs');

// Serve React Frontend static files with HTTP cache efficiency
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, {
    maxAge: '7d',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global Error Handler (Sanitizes stack traces in production)
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    error: isProd && status === 500 ? 'Internal Server Error' : (err.message || 'Server Error')
  });
});

// Start Server and Cron Engine
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Elderly Care & Medication Management Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health Check available at http://localhost:${PORT}/health\n`);
  startCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing server gracefully.');
  server.close(() => console.log('HTTP server closed.'));
});

module.exports = app;
