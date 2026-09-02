const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Mother = require('../models/Mother');
const { generateToken } = require('../utils/jwt');

const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, language, deliveryDate, village, latitude, longitude } = req.body;

    if (!name || !email || !password || !role || !['mother', 'asha', 'phc'].includes(role) || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Provide a valid name, email, password (8+ characters), and role'
      });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role,
      language: language || 'English'
    });

    if (role === 'mother') {
      const parsedDeliveryDate = deliveryDate ? new Date(deliveryDate) : new Date();
      if (Number.isNaN(parsedDeliveryDate.getTime())) {
        await User.deleteOne({ _id: user._id });
        return res.status(400).json({ success: false, message: 'Provide a valid delivery date' });
      }
      await Mother.create({
        userId: user._id,
        deliveryDate: parsedDeliveryDate,
        village,
        latitude: latitude === undefined ? undefined : Number(latitude),
        longitude: longitude === undefined ? undefined : Number(longitude)
      });
    }

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      data: { user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email
      }, role: user.role }
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: { user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        language: req.user.language
      } }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me };
