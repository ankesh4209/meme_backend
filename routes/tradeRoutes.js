const express = require('express');
const router = express.Router();

const { placeTrade } = require('../controllers/tradeController');

router.post('/place', placeTrade);

module.exports = router;
