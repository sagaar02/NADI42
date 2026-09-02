require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Mother = require('../models/Mother');
const CheckIn = require('../models/CheckIn');
const Case = require('../models/Case');
const FollowUp = require('../models/FollowUp');
const Facility = require('../models/Facility');

const seedDemoData = async () => {
  try {
    await connectDB();
    await Promise.all([
      User.deleteMany({}),
      Mother.deleteMany({}),
      CheckIn.deleteMany({}),
      Case.deleteMany({}),
      FollowUp.deleteMany({}),
      Facility.deleteMany({})
    ]);

    const phcUser = await User.create({
      name: 'Kaveri PHC Supervisor',
      email: 'phc@nadi42.demo',
      password: await bcrypt.hash('Demo@123', 10),
      role: 'phc',
      language: 'English'
    });

    const ashaUsers = await Promise.all([
      User.create({ name: 'Priya', email: 'priya@nadi42.demo', password: await bcrypt.hash('Demo@123', 10), role: 'asha' }),
      User.create({ name: 'Ananya', email: 'ananya@nadi42.demo', password: await bcrypt.hash('Demo@123', 10), role: 'asha' }),
      User.create({ name: 'Lata', email: 'lata@nadi42.demo', password: await bcrypt.hash('Demo@123', 10), role: 'asha' })
    ]);

    const motherUser = await User.create({
      name: 'Meena Sharma',
      email: 'meena@nadi42.demo',
      password: await bcrypt.hash('Demo@123', 10),
      role: 'mother',
      phone: '9876543210'
    });

    const mother = await Mother.create({
      userId: motherUser._id,
      ashaId: ashaUsers[0]._id,
      phcId: phcUser._id,
      deliveryDate: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000),
      village: 'Kaveri Village',
      latitude: 12.9716,
      longitude: 77.5946,
      currentRisk: 'green'
    });

    const otherMothers = await Promise.all(
      Array.from({ length: 41 }).map(async (_, index) => {
        const user = await User.create({
          name: `Mother ${index + 1}`,
          email: `mother${index + 1}@example.com`,
          password: await bcrypt.hash('Demo@123', 10),
          role: 'mother'
        });

        return Mother.create({
          userId: user._id,
          ashaId: ashaUsers[index % ashaUsers.length]._id,
          phcId: phcUser._id,
          deliveryDate: new Date(Date.now() - ((index % 20) + 7) * 24 * 60 * 60 * 1000),
          village: `Village ${index + 1}`,
          latitude: 12.9716 + (index % 5) * 0.01,
          longitude: 77.5946 + (index % 3) * 0.01,
          currentRisk: index % 3 === 0 ? 'green' : index % 3 === 1 ? 'amber' : 'red'
        });
      })
    );

    const redCheckIn = await CheckIn.create({
      motherId: mother._id,
      bleeding: 'more',
      fever: true,
      severeHeadache: false,
      visionChanges: false,
      emotionalDistress: false,
      feedingDifficulty: false,
      riskLevel: 'red',
      riskReasons: ['Fever or chills reported', 'Bleeding increased']
    });

    mother.currentRisk = 'red';
    mother.lastCheckInAt = new Date();
    await mother.save();

    const createdCase = await Case.create({
      motherId: mother._id,
      checkInId: redCheckIn._id,
      riskLevel: 'red',
      status: 'open',
      trigger: redCheckIn.riskReasons,
      assignedAshaId: ashaUsers[0]._id,
      phcId: phcUser._id
    });

    await FollowUp.create({
      caseId: createdCase._id,
      ashaId: ashaUsers[0]._id,
      scheduledAt: new Date(Date.now() + 86400000),
      notes: 'Follow-up call',
      status: 'scheduled'
    });

    for (let i = 0; i < 7; i++) {
      const caseMother = otherMothers[i];
      const checkIn = await CheckIn.create({
        motherId: caseMother._id,
        bleeding: i % 2 === 0 ? 'more' : 'heavy',
        fever: i % 2 === 0,
        severeHeadache: false,
        visionChanges: false,
        emotionalDistress: i % 3 === 0,
        feedingDifficulty: false,
        riskLevel: i % 2 === 0 ? 'amber' : 'red',
        riskReasons: ['Bleeding increased']
      });

      await Case.create({
        motherId: caseMother._id,
        checkInId: checkIn._id,
        riskLevel: checkIn.riskLevel,
        status: i === 0 ? 'acknowledged' : 'open',
        trigger: checkIn.riskReasons,
        assignedAshaId: ashaUsers[i % ashaUsers.length]._id,
        phcId: phcUser._id
      });
    }

    await Facility.create([
      { name: 'Kaveri PHC', type: 'PHC', address: 'Kaveri Road', latitude: 12.9716, longitude: 77.5946, phone: '080-123456' },
      { name: 'Mullai PHC', type: 'PHC', address: 'Mullai Street', latitude: 12.9816, longitude: 77.5846, phone: '080-654321' },
      { name: 'Sundaram Clinic', type: 'clinic', address: 'Sundaram Avenue', latitude: 12.9616, longitude: 77.6046, phone: '080-111222' }
    ]);

    console.log('Demo data seeded successfully');
    return true;
  } catch (error) {
    console.error('Seeding failed:', error.message);
    throw error;
  }
};

if (require.main === module) {
  seedDemoData().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seedDemoData };
