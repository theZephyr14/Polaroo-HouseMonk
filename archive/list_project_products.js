const axios = require("axios");

(async () => {
  const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI2ODkxZGZiZjA1MmQxZDdmMzM2ZDBkNjIiLCJ0eXBlcyI6WyJhZG1pbiJdLCJpYXQiOjE3NTg1MzY0NDUsImV4cCI6MTc2NjMxMjQ0NX0.hWgqc5wV6_4DQc4oTtve6YkLdKITKR-blPWywqy7NpU";
  const clientId = "1326bbe0-8ed1-11f0-b658-7dd414f87b53";
  const project = "6846923ef48a1a068bc874ce";
  try {
    const { data } = await axios.get(
      `https://dashboard.thehousemonk.com/api/product-and-service?projects=${project}`,
      { headers: { authorization: token, 'x-api-key': clientId } }
    );
    console.log('count', data.count);
    (data.rows || []).forEach((p, i) => {
      console.log(`${i + 1}. ${p.name} | id=${p._id}`);
    });
  } catch (e) {
    console.log('error', e.response?.status, e.response?.data?.message || e.message);
  }
})();
