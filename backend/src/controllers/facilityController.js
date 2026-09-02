const Facility = require('../models/Facility');
const { haversineDistance } = require('../services/mapsService');

const getFacilities = async (req, res, next) => {
  try {
    const facilities = await Facility.find();
    res.json({ success: true, facilities });
  } catch (error) {
    next(error);
  }
};

const getNearestFacility = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (lat === undefined || lng === undefined || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Number(lat) < -90 || Number(lat) > 90 || Number(lng) < -180 || Number(lng) > 180) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    const facilities = await Facility.find();

    const mapped = facilities
      .map((facility) => ({
        ...facility.toObject(),
        distanceKm: haversineDistance(latitude, longitude, facility.latitude, facility.longitude)
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ success: true, data: mapped[0] ? { facility: mapped[0], distanceKm: mapped[0].distanceKm, coordinates: { latitude: mapped[0].latitude, longitude: mapped[0].longitude }, address: mapped[0].address, phone: mapped[0].phone } : null });
  } catch (error) {
    next(error);
  }
};

module.exports = { getFacilities, getNearestFacility };
