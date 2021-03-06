
const Joi = require('joi');
const schedulingScheme = Joi.object({
  bookingName: Joi.string(),
  start_point: Joi.string(),
  start_loc_lat: Joi.number(),
  start_loc_long: Joi.number(),
  destination: Joi.string(),
  des_loc_lat: Joi.number(),
  des_loc_long: Joi.number(),
  wheelChairNumber: Joi.number(),
  bookingTime: Joi.string(),
  start_district: Joi.string(),
  end_district: Joi.string(),
  bookingEndTime: Joi.string().allow(""),
  start: Joi.number(),
  end: Joi.number(),
  phoneNumber: Joi.string().min(8).max(8),
  price: Joi.number(),
  passeger: Joi.string().allow(""),
  description: Joi.string().allow("")
})

module.exports = schedulingScheme;
