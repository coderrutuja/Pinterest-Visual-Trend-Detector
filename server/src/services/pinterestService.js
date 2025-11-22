const axios = require('axios');

const rapidApiKey = process.env.RAPIDAPI_KEY;
const rapidApiHost = process.env.RAPIDAPI_HOST || 'unofficial-pinterest-api.p.rapidapi.com';

function getClient() {
  if (!rapidApiKey) {
    throw new Error('RAPIDAPI_KEY is not set');
  }
  return axios.create({
    baseURL: `https://${rapidApiHost}`,
    headers: {
      'x-rapidapi-key': rapidApiKey,
      'x-rapidapi-host': rapidApiHost
    },
    timeout: 15000
  });
}

async function searchBoardsByKeyword(keyword, num = 20) {
  const client = getClient();
  const res = await client.get('/pinterest/boards/relevance', {
    params: { keyword, num }
  });
  return res.data;
}

async function searchPinsByKeyword(keyword, num = 40) {
  const client = getClient();
  const res = await client.get('/pinterest/pins/relevance', {
    params: { keyword, num }
  });
  return res.data;
}

module.exports = { searchBoardsByKeyword, searchPinsByKeyword };
