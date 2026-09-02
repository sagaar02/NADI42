const express = require('express');
const { getMyProfile, getMyTimeline, getAllMothers } = require('../controllers/motherController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/me', authMiddleware, roleMiddleware('mother'), getMyProfile);
router.get('/me/timeline', authMiddleware, roleMiddleware('mother'), getMyTimeline);
router.get('/', authMiddleware, roleMiddleware('asha', 'phc'), getAllMothers);

module.exports = router;
