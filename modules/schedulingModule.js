
const Joi = require('joi');
const schedulingScheme = Joi.object({
  userid: Joi.string().allow(""),
  bookingName: Joi.string(),
  start_point: Joi.string(),
  start_loc_lat: Joi.number(),
  start_loc_long: Joi.number(),
  destination: Joi.string(),
  des_loc_lat: Joi.number(),
  des_loc_long: Joi.number(),
  bookingTime: Joi.string(),
  start: Joi.number(),
  end: Joi.number(),
  phoneNumber: Joi.string().min(8).max(8),
  price: Joi.number(),
  clientName: Joi.string().allow(""),
  description: Joi.string().allow("")
})

module.exports = schedulingScheme;
