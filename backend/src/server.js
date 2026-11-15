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

// Middleware
app.use(cors());
app.use(express.json());

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
app.use('/api/auth', authRoutes);
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

// Serve React Frontend static files if built
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path === '/health') return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global 404 handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start Server and Cron Engine
app.listen(PORT, () => {
  console.log(`\n🚀 Elderly Care & Medication Management Backend running on http://localhost:${PORT}`);
  console.log(`📡 Health Check available at http://localhost:${PORT}/health\n`);
  startCronJobs();
});

module.exports = app;
