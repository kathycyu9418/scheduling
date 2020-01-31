const Joi = require('joi');
const carTypeSchema = Joi.object({
  licensePlateNumber: Joi.string(),
  description: Joi.string().allow(""),
  wheelChairNumber: Joi.number(),
  passegerNumber: Joi.number()
})

module.exports = carTypeSchema;
