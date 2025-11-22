const ColorThief = require('colorthief');
const axios = require('axios');

async function fetchImageBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

async function extractPalette(buffer, colorCount = 5) {
  const palette = await ColorThief.getPalette(buffer, colorCount);
  return palette.map(([r, g, b]) => ({ r, g, b }));
}

function rgbToHex(r, g, b) {
  const toHex = (v) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function computeAverageFromPalette(palette) {
  if (!palette || palette.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  for (const { r, g, b } of palette) {
    sumR += r;
    sumG += g;
    sumB += b;
  }
  const count = palette.length;
  return {
    r: Math.round(sumR / count),
    g: Math.round(sumG / count),
    b: Math.round(sumB / count)
  };
}

function classifyStyleFromColor({ r, g, b }) {
  const brightness = (r + g + b) / (3 * 255);
  const maxChannel = Math.max(r, g, b);
  const minChannel = Math.min(r, g, b);
  const saturation = (maxChannel - minChannel) / (maxChannel || 1);
  const tags = [];
  if (brightness > 0.75) tags.push('bright');
  if (brightness < 0.35) tags.push('dark');
  if (saturation > 0.5) tags.push('vibrant');
  if (saturation < 0.25) tags.push('muted');
  if (tags.length === 0) tags.push('balanced');
  return { brightness, saturation, tags };
}

async function analyzeImageFromUrl(url) {
  const buffer = await fetchImageBuffer(url);
  const palette = await extractPalette(buffer, 6);
  const avg = computeAverageFromPalette(palette);
  const style = classifyStyleFromColor(avg);
  return {
    palette: palette.map((c) => ({ ...c, hex: rgbToHex(c.r, c.g, c.b) })),
    averageColor: { ...avg, hex: rgbToHex(avg.r, avg.g, avg.b) },
    style
  };
}

module.exports = { analyzeImageFromUrl };
