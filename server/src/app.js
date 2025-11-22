const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const trendRoutes = require('./routes/trendRoutes');
const pinterestRoutes = require('./routes/pinterestRoutes');

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/pinterest', pinterestRoutes);

module.exports = app;
