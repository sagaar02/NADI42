const Case = require('../models/Case');
const Mother = require('../models/Mother');
const FollowUp = require('../models/FollowUp');
const CheckIn = require('../models/CheckIn');
const { isObjectId, sanitizePagination } = require('../utils/validators');
const activeStatuses = ['open', 'acknowledged', 'follow_up'];

const owns = async (item, user) => {
  if (user.role === 'mother') return !!(await Mother.exists({ _id: item.motherId, userId: user._id }));
  return user.role === 'asha' ? String(item.assignedAshaId) === String(user._id) : String(item.phcId) === String(user._id);
};
const findOwned = async (id, user) => {
  if (!isObjectId(id)) return null;
  const item = await Case.findById(id);
  return item && await owns(item, user) ? item : null;
};

const getCases = async (req, res, next) => { try {
  let filter = req.user.role === 'asha' ? { assignedAshaId: req.user._id } : req.user.role === 'phc' ? { phcId: req.user._id } : {};
  if (req.user.role === 'mother') { const mother = await Mother.findOne({ userId: req.user._id }); filter = { motherId: mother?._id }; }
  if (req.query.risk) filter.riskLevel = req.query.risk;
  if (req.query.status) filter.status = req.query.status;
  const { page, limit } = sanitizePagination(req.query);
  const [items, total] = await Promise.all([Case.find(filter).populate('motherId assignedAshaId phcId checkInId').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), Case.countDocuments(filter)]);
  res.json({ success: true, data: { cases: items, pagination: { page, limit, total } } });
} catch (error) { next(error); } };

const getCaseById = async (req, res, next) => { try {
  const found = await findOwned(req.params.id, req.user);
  if (!found) return res.status(404).json({ success: false, message: 'Case not found' });
  const [item, followUps] = await Promise.all([Case.findById(found._id).populate({ path: 'motherId', populate: { path: 'userId ashaId phcId', select: 'name email phone' } }).populate('checkInId assignedAshaId phcId'), FollowUp.find({ caseId: found._id }).sort({ scheduledAt: 1 })]);
  res.json({ success: true, data: { case: item, followUps } });
} catch (error) { next(error); } };

const acknowledgeCase = async (req, res, next) => { try {
  const found = await findOwned(req.params.id, req.user);
  if (!found) return res.status(404).json({ success: false, message: 'Case not found' });
  if (found.status === 'resolved') return res.status(409).json({ success: false, message: 'Resolved cases cannot be acknowledged' });
  found.status = 'acknowledged'; await found.save(); res.json({ success: true, data: found, message: 'Case acknowledged' });
} catch (error) { next(error); } };

const markFollowUp = async (req, res, next) => { try {
  const found = await findOwned(req.params.id, req.user);
  if (!found) return res.status(404).json({ success: false, message: 'Case not found' });
  if (found.status === 'resolved') return res.status(409).json({ success: false, message: 'Resolved cases cannot be updated' });
  found.status = 'follow_up'; await found.save(); res.json({ success: true, data: found, message: 'Case marked for follow-up' });
} catch (error) { next(error); } };

const resolveCase = async (req, res, next) => { try {
  const found = await findOwned(req.params.id, req.user);
  if (!found) return res.status(404).json({ success: false, message: 'Case not found' });
  if (found.status === 'resolved') return res.status(409).json({ success: false, message: 'Case is already resolved' });
  found.status = 'resolved'; found.resolvedAt = new Date(); await found.save();
  await Mother.findByIdAndUpdate(found.motherId, { currentRisk: 'green' });
  res.json({ success: true, data: found, message: 'Case resolved' });
} catch (error) { next(error); } };

const getAshaDashboard = async (req, res, next) => {
  try {
    const ashaId = req.user._id;
    const mothers = { ashaId };
    const caseFilter = { assignedAshaId: ashaId };
    const ids = await Mother.find(mothers).distinct('_id');

    const [totalMothers, stableMothers, amberMothers, redMothers, openCases, urgentCases, pendingFollowUps, recentCases, recentCheckIns] = await Promise.all([
      Mother.countDocuments(mothers),
      Mother.countDocuments({ ...mothers, currentRisk: 'green' }),
      Mother.countDocuments({ ...mothers, currentRisk: 'amber' }),
      Mother.countDocuments({ ...mothers, currentRisk: 'red' }),
      Case.countDocuments({ ...caseFilter, status: { $in: activeStatuses } }),
      Case.find({ ...caseFilter, riskLevel: 'red', status: { $in: activeStatuses } })
        .populate({ path: 'motherId', populate: { path: 'userId', select: 'name email phone' } })
        .sort({ createdAt: -1 })
        .limit(10),
      FollowUp.countDocuments({ ashaId, status: 'scheduled' }),
      Case.find(caseFilter)
        .populate({ path: 'motherId', populate: { path: 'userId', select: 'name email phone' } })
        .populate('assignedAshaId')
        .sort({ createdAt: -1 })
        .limit(8),
      CheckIn.find({ motherId: { $in: ids } })
        .populate({ path: 'motherId', populate: { path: 'userId', select: 'name' } })
        .sort({ createdAt: -1 })
        .limit(8)
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const todayFollowUps = await FollowUp.find({
      ashaId,
      status: 'scheduled',
      scheduledAt: { $gte: today, $lt: tomorrow }
    }).populate('caseId').sort({ scheduledAt: 1 });

    res.json({
      success: true,
      data: {
        metrics: {
          total: totalMothers,
          totalMothers,
          stableMothers,
          amberMothers,
          redMothers,
          openCases,
          urgentCases: urgentCases.length,
          pendingFollowUps
        },
        urgentCases,
        todayFollowUps,
        recentCases,
        recentCheckIns
      }
    });
  } catch (error) {
    next(error);
  }
};

const getPhcDashboard = async (req, res, next) => {
  try {
    const mothers = { phcId: req.user._id };
    const cases = { phcId: req.user._id };
    const caseIds = await Case.find(cases).distinct('_id');

    const [totalMothers, green, amber, red, openCases, urgentCases, resolvedCases, followUps, completedFollowUps, recentCases] = await Promise.all([
      Mother.countDocuments(mothers),
      Mother.countDocuments({ ...mothers, currentRisk: 'green' }),
      Mother.countDocuments({ ...mothers, currentRisk: 'amber' }),
      Mother.countDocuments({ ...mothers, currentRisk: 'red' }),
      Case.countDocuments({ ...cases, status: { $in: activeStatuses } }),
      Case.countDocuments({ ...cases, riskLevel: 'red', status: { $in: activeStatuses } }),
      Case.countDocuments({ ...cases, status: 'resolved' }),
      FollowUp.countDocuments({ caseId: { $in: caseIds } }),
      FollowUp.countDocuments({ status: 'completed', caseId: { $in: caseIds } }),
      Case.find(cases)
        .populate({ path: 'motherId', populate: { path: 'userId', select: 'name email phone' } })
        .populate('assignedAshaId')
        .sort({ createdAt: -1 })
        .limit(8)
    ]);

    const ashaDistribution = await Mother.aggregate([
      { $match: mothers },
      {
        $group: {
          _id: '$ashaId',
          mothers: { $sum: 1 },
          amber: { $sum: { $cond: [{ $eq: ['$currentRisk', 'amber'] }, 1, 0] } },
          red: { $sum: { $cond: [{ $eq: ['$currentRisk', 'red'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        metrics: {
          total: totalMothers,
          totalMothers,
          green,
          amber,
          red,
          openCases,
          urgentCases,
          resolvedCases,
          followUps,
          completedFollowUps,
          followUpCompletionRate: followUps ? Math.round((completedFollowUps / followUps) * 100) : 0
        },
        ashaDistribution,
        recentCases
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getCases, getCaseById, acknowledgeCase, markFollowUp, resolveCase, getAshaDashboard, getPhcDashboard, findOwned };
