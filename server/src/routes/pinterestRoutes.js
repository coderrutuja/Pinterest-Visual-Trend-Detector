const express = require('express');
const { searchBoardsByKeyword, searchPinsByKeyword } = require('../services/pinterestService');

const router = express.Router();

// Keyword-based boards search: GET /api/pinterest/boards?keyword=...&num=...
router.get('/boards', async (req, res) => {
  const { keyword, num } = req.query;
  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ message: 'keyword query parameter is required' });
  }
  try {
    const data = await searchBoardsByKeyword(keyword.trim(), Number(num) || 20);
    res.json({ boards: data.data || data });
  } catch (error) {
    console.error('Error fetching Pinterest boards', error?.response?.data || error.message || error);
    const status = error?.response?.status || 500;
    res.status(status).json({
      message: 'Failed to fetch boards',
      rapidapiError: error?.response?.data || error.message || 'Unknown error'
    });
  }
});

// Keyword-based pins search: GET /api/pinterest/pins?keyword=...&num=...
router.get('/pins', async (req, res) => {
  const { keyword, num } = req.query;
  if (!keyword || !keyword.trim()) {
    return res.status(400).json({ message: 'keyword query parameter is required' });
  }
  try {
    const data = await searchPinsByKeyword(keyword.trim(), Number(num) || 40);
    res.json({ pins: data.data || data });
  } catch (error) {
    console.error('Error fetching Pinterest pins', error?.response?.data || error.message || error);
    const status = error?.response?.status || 500;
    res.status(status).json({
      message: 'Failed to fetch pins',
      rapidapiError: error?.response?.data || error.message || 'Unknown error'
    });
  }
});

module.exports = router;
