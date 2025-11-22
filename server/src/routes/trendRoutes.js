const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { analyzePinsForTrends } = require('../services/trendAnalysisService');
const { pool } = require('../config/db');

const router = express.Router();

router.post('/analyze', requireAuth, async (req, res) => {
  const { category, pins } = req.body;
  if (!pins || !Array.isArray(pins) || pins.length === 0) {
    return res.status(400).json({ message: 'pins array is required' });
  }
  try {
    const result = await analyzePinsForTrends({
      category: category || 'Uncategorized',
      pins,
      userId: req.user?.id || null
    });
    res.json(result);
  } catch (error) {
    console.error('Trend analysis error', error);
    res.status(500).json({ message: 'Failed to analyze trends' });
  }
});

router.get('/history', requireAuth, async (req, res) => {
  const { category, limit } = req.query;
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const rowsLimit = Number(limit) > 0 && Number(limit) <= 20 ? Number(limit) : 5;

  const params = [userId];
  let where = 'user_id = $1';
  if (category && category.trim()) {
    params.push(category.trim());
    where += ' AND category = $2';
  }

  try {
    const result = await pool.query(
      `SELECT id, category, captured_at, metrics
       FROM trend_snapshots
       WHERE ${where}
       ORDER BY captured_at DESC
       LIMIT ${rowsLimit}`,
      params
    );

    const snapshots = result.rows.map((row) => ({
      id: row.id,
      category: row.category,
      capturedAt: row.captured_at,
      metrics: row.metrics
    }));

    function buildForecastSummary(list) {
      if (!list.length) return 'Not enough history yet to forecast trends.';
      if (list.length === 1) return 'Single snapshot available – run more analyses to see trends over time.';

      const latest = list[0].metrics || {};
      const earliest = list[list.length - 1].metrics || {};

      const latestColors = latest.dominantColors || [];
      const earliestColors = earliest.dominantColors || [];
      const latestStyles = latest.styleDistribution || [];
      const earliestStyles = earliest.styleDistribution || [];

      const topLatestColor = latestColors[0];
      const topEarliestColor = earliestColors[0];
      const topLatestStyle = latestStyles[0];
      const topEarliestStyle = earliestStyles[0];

      const parts = [];

      if (topLatestColor && topEarliestColor) {
        if (topLatestColor.hex === topEarliestColor.hex) {
          parts.push(`Core palette remains stable around ${topLatestColor.hex}.`);
        } else {
          parts.push(`Palette is shifting from ${topEarliestColor.hex} towards ${topLatestColor.hex}.`);
        }
      } else if (topLatestColor) {
        parts.push(`Current dominant color is ${topLatestColor.hex}.`);
      }

      if (topLatestStyle && topEarliestStyle) {
        if (topLatestStyle.tag === topEarliestStyle.tag) {
          parts.push(`Style trend stays mostly ${topLatestStyle.tag}.`);
        } else {
          parts.push(`Style mix is moving from ${topEarliestStyle.tag} to ${topLatestStyle.tag}.`);
        }
      } else if (topLatestStyle) {
        parts.push(`Style distribution is led by ${topLatestStyle.tag}.`);
      }

      if (!parts.length) {
        return 'History captured, but not enough color/style signals to describe a forecast yet.';
      }

      return parts.join(' ');
    }

    const forecastSummary = buildForecastSummary(snapshots);

    res.json({
      snapshots: snapshots.map((s) => ({
        id: s.id,
        category: s.category,
        capturedAt: s.capturedAt,
        totalPins: (s.metrics && s.metrics.totalPins) || 0,
        topColor: (s.metrics && s.metrics.dominantColors && s.metrics.dominantColors[0]) || null,
        topStyle: (s.metrics && s.metrics.styleDistribution && s.metrics.styleDistribution[0]) || null
      })),
      forecastSummary
    });
  } catch (error) {
    console.error('History fetch error', error);
    res.status(500).json({ message: 'Failed to load history' });
  }
});

module.exports = router;
