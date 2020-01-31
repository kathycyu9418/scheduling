var mongodb = require('mongoose');
var Schema = mongodb.Schema;

var carType = mongodb.Schema({
  licensePlateNumber: String,
  description: String,
  wheelChairNumber: Number,
  passegerNumber: Number
});

module.exports = carType = mongodb.model('carTypes', carType, 'carTypes');
