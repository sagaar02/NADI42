const express = require('express');
const { getFacilities, getNearestFacility } = require('../controllers/facilityController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getFacilities);
router.get('/nearest', authMiddleware, getNearestFacility);

module.exports = router;
