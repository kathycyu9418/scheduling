var mongodb = require('mongoose');
var Schema = mongodb.Schema;

var phoneNumber = mongodb.Schema({
  bookingName: String,
  start_location: {start_point:String, lat:Number, long:Number},
  destination: {dest:String, lat:Number, long:Number},
  bookingTime: {booking:String, start:Number, end:Number},
	carType: {licensePlateNumber: String, wheelChairNumber:Number},
  phoneNumber: String,
  price: Number,
  clientName: String,
  description: String
});

module.exports = phoneNumber = mongodb.model('schedule', phoneNumber, 'schedule');
