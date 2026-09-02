const express = require('express');
const { getCases, getCaseById, acknowledgeCase, markFollowUp, resolveCase } = require('../controllers/caseController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

router.get('/', authMiddleware, getCases);
router.get('/:id', authMiddleware, getCaseById);
router.patch('/:id/acknowledge', authMiddleware, roleMiddleware('asha'), acknowledgeCase);
router.patch('/:id/follow-up', authMiddleware, roleMiddleware('asha'), markFollowUp);
router.patch('/:id/resolve', authMiddleware, roleMiddleware('asha', 'phc'), resolveCase);

module.exports = router;
