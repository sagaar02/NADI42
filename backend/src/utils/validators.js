const mongoose = require('mongoose');

const isObjectId = (value) => mongoose.isValidObjectId(value);
const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());
const isFiniteCoordinate = (value, min, max) => Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max;
const sanitizePagination = (query) => ({
  page: Math.max(1, Number.parseInt(query.page, 10) || 1),
  limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
});

module.exports = { isObjectId, isValidDate, isFiniteCoordinate, sanitizePagination };
