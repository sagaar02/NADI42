const router = require('express').Router();
const auth = require('../middleware/authMiddleware'); const role = require('../middleware/roleMiddleware');
const { getAshaDashboard, getCases } = require('../controllers/caseController'); const { getFollowUps } = require('../controllers/followupController'); const { getAllMothers } = require('../controllers/motherController');
router.use(auth, role('asha')); router.get('/dashboard', getAshaDashboard); router.get('/mothers', getAllMothers); router.get('/cases', getCases); router.get('/followups', getFollowUps); module.exports = router;
