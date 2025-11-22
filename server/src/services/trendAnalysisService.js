const { pool } = require('../config/db');
const { analyzeImageFromUrl } = require('./imageAnalysisService');

async function analyzePinsForTrends({ category, pins, userId = null }) {
  const analyses = [];
  for (const pin of pins) {
    if (!pin.imageUrl) continue;
    try {
      const imageAnalysis = await analyzeImageFromUrl(pin.imageUrl);
      analyses.push({
        id: pin.id || pin.url || pin.imageUrl,
        createdAt: pin.createdAt ? new Date(pin.createdAt) : new Date(),
        imageUrl: pin.imageUrl,
        analysis: imageAnalysis
      });
    } catch (error) {
      console.error('Image analysis failed for pin', pin, error);
    }
  }

  const colorCountMap = new Map();
  const styleCountMap = new Map();

  for (const item of analyses) {
    item.analysis.palette.forEach((c) => {
      const key = c.hex;
      colorCountMap.set(key, (colorCountMap.get(key) || 0) + 1);
    });
    item.analysis.style.tags.forEach((t) => {
      styleCountMap.set(t, (styleCountMap.get(t) || 0) + 1);
    });
  }

  const colors = Array.from(colorCountMap.entries())
    .map(([hex, count]) => ({ hex, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const styles = Array.from(styleCountMap.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  const seasons = {};
  analyses.forEach((item) => {
    const month = (item.createdAt.getUTCMonth() + 1).toString().padStart(2, '0');
    const key = `${month}`;
    seasons[key] = seasons[key] || { month: key, count: 0 };
    seasons[key].count += 1;
  });

  const seasonal = Object.values(seasons).sort((a, b) => a.month.localeCompare(b.month));

  const metrics = {
    category,
    totalPins: analyses.length,
    dominantColors: colors,
    styleDistribution: styles,
    seasonalPattern: seasonal,
    sampleImages: analyses.slice(0, 24).map((item) => item.imageUrl)
  };

  if (analyses.length > 0) {
    try {
      await pool.query(
        'INSERT INTO trend_snapshots (user_id, category, captured_at, metrics) VALUES ($1, $2, NOW(), $3::jsonb)',
        [userId, category, JSON.stringify(metrics)]
      );
    } catch (error) {
      console.error('Failed to persist trend snapshot', error);
    }
  }

  return metrics;
}

module.exports = { analyzePinsForTrends };
