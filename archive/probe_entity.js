const axios = require("axios");
const userToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
const id = "68d1508efa8e72033f3917d0";
(async () => {
  try {
    const res = await axios.get(`https://dashboard.thehousemonk.com/api/listing/${id}`, { headers: { authorization: userToken, 'x-api-key': clientId } });
    console.log('LISTING OK');
    console.log(JSON.stringify({
      _id: res.data._id,
      name: res.data.name || res.data.address,
      project: typeof res.data.project === 'object' ? res.data.project._id || res.data.project.id : res.data.project,
      unit: res.data.unit || res.data.home || res.data.listing || null
    }, null, 2));
  } catch (e) {
    console.log('LISTING FAIL', e.response?.status, e.response?.data?.message || e.message);
  }
  try {
    const res = await axios.get(`https://dashboard.thehousemonk.com/api/home/${id}`, { headers: { authorization: userToken, 'x-api-key': clientId } });
    console.log('HOME OK');
    console.log(JSON.stringify({ _id: res.data._id, project: res.data.project, listing: res.data.listing }, null, 2));
  } catch (e) {
    console.log('HOME FAIL', e.response?.status, e.response?.data?.message || e.message);
  }
})();
