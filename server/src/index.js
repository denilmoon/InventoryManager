const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const { authenticate, requireAdmin } = require('./middleware/auth');

// Protected test route
app.get('/api/test-auth', authenticate, (req, res) => {
  res.json({ message: 'You are authenticated', user: req.user });
});

// Admin only test route
app.get('/api/test-admin', authenticate, requireAdmin, (req, res) => {
  res.json({ message: 'You are an admin', user: req.user });
});