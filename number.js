var mongodb = require('mongoose');
var Schema = mongodb.Schema;

var phoneNumber = mongodb.Schema({
	userid: String,
  bookingName: String,
  start_point: String,
  start_loc_lat: Number,
  start_loc_long: Number,
  destination: String,
  des_loc_lat: Number,
  des_loc_long: Number,
  bookingTime: String,
  start: Number,
  end: Number,
  phoneNumber: String,
  price: Number,
  clientName: String,
  description: String
});

module.exports = phoneNumber = mongodb.model('schedule', phoneNumber, 'schedule');
