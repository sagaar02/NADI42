const express = require('express');
const { createCheckIn, getCheckInHistory, getLatestCheckIn } = require('../controllers/checkinController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('mother'), createCheckIn);
router.get('/history', authMiddleware, roleMiddleware('mother'), getCheckInHistory);
router.get('/latest', authMiddleware, roleMiddleware('mother'), getLatestCheckIn);

module.exports = router;
