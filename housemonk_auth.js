const axios = require('axios');

async function refreshClientToken({ clientId, clientSecret }) {
  const url = 'https://dashboard.thehousemonk.com/api/client/refresh-token';
  const { data } = await axios.post(url, { clientId, clientSecret });
  return data.token;
}

async function getUserAccessToken({ clientId, masterToken, userId }) {
  const url = 'https://dashboard.thehousemonk.com/integration/glynk/access-token';
  const { data } = await axios.post(
    url,
    { user: userId },
    {
      headers: {
        'x-api-key': clientId,
        'authorization': `Bearer ${masterToken}`,
        'content-type': 'application/json'
      }
    }
  );
  const obj = Array.isArray(data) ? data[0] : data;
  return obj.accessToken;
}

module.exports = { refreshClientToken, getUserAccessToken };


