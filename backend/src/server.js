require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorMiddleware = require('./middleware/errorMiddleware');
const { getAshaDashboard, getPhcDashboard } = require('./controllers/caseController');
const authMiddleware = require('./middleware/authMiddleware');
const roleMiddleware = require('./middleware/roleMiddleware');
const { seedDemoData } = require('./seed/seedDemoData');

const app = express();

(async () => {
  await connectDB();

  if (process.env.SEED_DEMO_DATA === 'true') {
    await seedDemoData();
  }

  app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use((req, res, next) => { if (process.env.NODE_ENV !== 'production') console.log(`${req.method} ${req.path}`); next(); });

  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/mothers', require('./routes/motherRoutes'));
  app.use('/api/checkins', require('./routes/checkinRoutes'));
  app.use('/api/cases', require('./routes/caseRoutes'));
  app.use('/api/followups', require('./routes/followupRoutes'));
  app.use('/api/facilities', require('./routes/facilityRoutes'));
  app.use('/api/asha', require('./routes/ashaRoutes'));
  app.use('/api/phc', require('./routes/phcRoutes'));

  app.get('/api/asha/dashboard', authMiddleware, roleMiddleware('asha'), getAshaDashboard);
  app.get('/api/phc/dashboard', authMiddleware, roleMiddleware('phc'), getPhcDashboard);
  app.get('/api/cases/asha/dashboard', authMiddleware, roleMiddleware('asha'), getAshaDashboard);
  app.get('/api/cases/phc/dashboard', authMiddleware, roleMiddleware('phc'), getPhcDashboard);

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: 'Nadi42 API is running',
      database: 'connected'
    });
  });

  app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
  app.use(errorMiddleware);

  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, () => {
    console.log(`Nadi42 API running on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing process or change PORT in .env.`);
      process.exit(1);
    }

    console.error('Server failed to start:', error.message);
    process.exit(1);
  });
})();
