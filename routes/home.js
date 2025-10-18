const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const connectionString = process.env.TOKEN;
  res.json({ message: `My connection string is ${connectionString}` });
});

module.exports = router;
