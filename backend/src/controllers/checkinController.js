const CheckIn = require('../models/CheckIn');
const Mother = require('../models/Mother');
const Case = require('../models/Case');
const calculateRisk = require('../services/riskEngine');
const { sanitizePagination } = require('../utils/validators');

const createCheckIn = async (req, res, next) => {
  try {
    const mother = await Mother.findOne({ userId: req.user._id });
    if (!mother) return res.status(404).json({ success: false, message: 'Mother profile not found' });

    const { bleeding } = req.body;
    if (!['normal', 'more', 'heavy'].includes(bleeding)) {
      return res.status(400).json({ success: false, message: 'Provide a valid bleeding response (normal, more, heavy)' });
    }

    const fever = Boolean(req.body.fever);
    const severeHeadache = Boolean(req.body.severeHeadache);
    const visionChanges = Boolean(req.body.visionChanges);
    const emotionalDistress = Boolean(req.body.emotionalDistress);
    const feedingDifficulty = Boolean(req.body.feedingDifficulty);

    const risk = calculateRisk({ bleeding, fever, severeHeadache, visionChanges, emotionalDistress, feedingDifficulty });
    const checkIn = await CheckIn.create({
      motherId: mother._id,
      bleeding,
      fever,
      severeHeadache,
      visionChanges,
      emotionalDistress,
      feedingDifficulty,
      riskLevel: risk.level,
      riskReasons: risk.reasons
    });

    mother.currentRisk = risk.level;
    mother.lastCheckInAt = new Date();
    await mother.save();

    let caseItem = null;
    if (risk.level !== 'green') {
      caseItem = await Case.findOne({ motherId: mother._id, status: { $in: ['open', 'acknowledged', 'follow_up'] } });
      if (caseItem) {
        caseItem.riskLevel = risk.level === 'red' ? 'red' : caseItem.riskLevel;
        caseItem.trigger = [...new Set([...(caseItem.trigger || []), ...risk.reasons])];
        await caseItem.save();
      } else {
        caseItem = await Case.create({
          motherId: mother._id,
          checkInId: checkIn._id,
          riskLevel: risk.level,
          trigger: risk.reasons,
          assignedAshaId: mother.ashaId,
          phcId: mother.phcId
        });
      }
    }

    res.status(201).json({ success: true, data: { checkIn, risk, case: caseItem }, message: 'Check-in saved' });
  } catch (error) {
    next(error);
  }
};
const getCheckInHistory = async (req, res, next) => { try { const mother = await Mother.findOne({ userId: req.user._id }); if (!mother) return res.status(404).json({ success: false, message: 'Mother profile not found' }); const { page, limit } = sanitizePagination(req.query); const filter = { motherId: mother._id }; const [checkIns, total] = await Promise.all([CheckIn.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit), CheckIn.countDocuments(filter)]); res.json({ success: true, data: { checkIns, pagination: { page, limit, total } } }); } catch (error) { next(error); } };
const getLatestCheckIn = async (req, res, next) => { try { const mother = await Mother.findOne({ userId: req.user._id }); if (!mother) return res.status(404).json({ success: false, message: 'Mother profile not found' }); const latest = await CheckIn.findOne({ motherId: mother._id }).sort({ createdAt: -1 }); res.json({ success: true, data: latest || null, message: latest ? undefined : 'No check-in found' }); } catch (error) { next(error); } };
module.exports = { createCheckIn, getCheckInHistory, getLatestCheckIn };
