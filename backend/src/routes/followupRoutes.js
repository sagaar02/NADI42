const express = require('express');
const { createFollowUp, getFollowUps, completeFollowUp, cancelFollowUp } = require('../controllers/followupController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/', authMiddleware, roleMiddleware('asha'), createFollowUp);
router.get('/', authMiddleware, roleMiddleware('asha', 'phc'), getFollowUps);
router.patch('/:id/complete', authMiddleware, roleMiddleware('asha'), completeFollowUp);
router.patch('/:id/cancel', authMiddleware, roleMiddleware('asha'), cancelFollowUp);

module.exports = router;
