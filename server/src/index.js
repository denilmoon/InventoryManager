const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Import and use location routes
const locationRoutes = require('./routes/locations');

const inventoryRoutes = require('./routes/inventory');

app.use('/api/inventory', inventoryRoutes);

// Server uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// add this line with the other app.use route lines
app.use('/api/locations', locationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
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

// Import and use dashboard routes
const dashboardRoutes = require('./routes/dashboard');
const stockCountRoutes = require('./routes/stockCounts');

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/stock-counts', stockCountRoutes);

// Import and use supplier routes
const supplierRoutes = require('./routes/suppliers');
app.use('/api/suppliers', supplierRoutes);

// Import and use shipper, shipment, reorder, people, and dispatch routes
const shipperRoutes = require('./routes/shippers');
const shipmentRoutes = require('./routes/shipments');
const reorderRoutes = require('./routes/reorders');
const peopleRoutes = require('./routes/people');
const dispatchRoutes = require('./routes/dispatch');

app.use('/api/shippers', shipperRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/reorders', reorderRoutes);
app.use('/api/people', peopleRoutes);
app.use('/api/dispatch', dispatchRoutes);