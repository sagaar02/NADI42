const router = require('express').Router();
const auth = require('../middleware/authMiddleware'); const role = require('../middleware/roleMiddleware'); const { getPhcDashboard, getCases } = require('../controllers/caseController');
router.use(auth, role('phc')); router.get('/dashboard', getPhcDashboard); router.get('/cases', getCases); module.exports = router;
