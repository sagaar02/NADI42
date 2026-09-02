const Mother = require('../models/Mother');
const User = require('../models/User');
const CheckIn = require('../models/CheckIn');
const Case = require('../models/Case');
const FollowUp = require('../models/FollowUp');
const { buildTimeline } = require('../services/timelineService');

const getMyProfile = async (req, res, next) => {
  try {
    const mother = await Mother.findOne({ userId: req.user._id }).populate('userId ashaId phcId');
    if (!mother) {
      return res.status(404).json({ success: false, message: 'Mother profile not found' });
    }

    const latestCheckIn = await CheckIn.findOne({ motherId: mother._id }).sort({ createdAt: -1 });
    const nextFollowUp = await FollowUp.findOne({ caseId: { $in: await Case.find({ motherId: mother._id }).distinct('_id') } }).sort({ scheduledAt: 1 });

    const postpartumDay = Math.max(0, Math.ceil((Date.now() - new Date(mother.deliveryDate)) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        id: mother._id,
        name: mother.userId?.name || req.user.name,
        role: req.user.role,
        postpartumDay,
        deliveryDate: mother.deliveryDate,
        village: mother.village,
        risk: mother.currentRisk,
        asha: mother.ashaId ? { id: mother.ashaId._id, name: mother.ashaId.name } : null,
        phc: mother.phcId ? { id: mother.phcId._id, name: mother.phcId.name } : null,
        lastCheckInAt: mother.lastCheckInAt,
        nextFollowUp: nextFollowUp ? {
          id: nextFollowUp._id,
          scheduledAt: nextFollowUp.scheduledAt,
          status: nextFollowUp.status,
          notes: nextFollowUp.notes
        } : null,
        latestCheckIn: latestCheckIn ? {
          id: latestCheckIn._id,
          riskLevel: latestCheckIn.riskLevel,
          bleeding: latestCheckIn.bleeding,
          createdAt: latestCheckIn.createdAt
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMyTimeline = async (req, res, next) => {
  try {
    const mother = await Mother.findOne({ userId: req.user._id });
    if (!mother) {
      return res.status(404).json({ success: false, message: 'Mother profile not found' });
    }

    const checkIns = await CheckIn.find({ motherId: mother._id }).sort({ createdAt: -1 });
    const motherCases = await Case.find({ motherId: mother._id }).sort({ createdAt: -1 });
    const caseIds = motherCases.map((item) => item._id);
    const followUps = await FollowUp.find({ caseId: { $in: caseIds } }).sort({ scheduledAt: 1 });

    const currentDay = Math.max(0, Math.ceil((Date.now() - new Date(mother.deliveryDate)) / (1000 * 60 * 60 * 24)));

    res.json({
      success: true,
      data: {
        deliveryDate: mother.deliveryDate,
        postpartumDay: currentDay,
        events: buildTimeline({ mother, checkIns, cases: motherCases, followUps })
      }
    });
  } catch (error) {
    next(error);
  }
};

const getAllMothers = async (req, res, next) => {
  try {
    const filter = req.user.role === 'asha' ? { ashaId: req.user._id } : { phcId: req.user._id };
    const mothers = await Mother.find(filter).populate('userId ashaId phcId');
    res.json({ success: true, data: { mothers }, mothers });
  } catch (error) {
    next(error);
  }
};

module.exports = { getMyProfile, getMyTimeline, getAllMothers };
