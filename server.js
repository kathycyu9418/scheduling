const express = require('express');
const app = express();
const fs = require('fs');
const MongoClient = require('mongodb').MongoClient;
var bodyParser = require('body-parser');
const assert = require('assert');
const Joi = require('joi');
const ObjectID = require('mongodb').ObjectID;
const formidable = require('formidable');
const mongourl = 'mongodb+srv://lauwa:1027@cluster0-7cnzq.mongodb.net/test?retryWrites=true&w=majority';
const dbName = 'test';
const schedulingScheme = require(__dirname + "/modules/schedulingModule");
const carTypeScheme = require(__dirname + "/modules/carTypeModule");
const Moment = require('moment');
const MomentRange = require('moment-range');
var mongodb = require('mongoose');
var phoneNumber= require(__dirname + "/modules/number");
var carType = require(__dirname + "/modules/carType");
const googleMapsClient = require('@google/maps').createClient({
  key: 'AIzaSyB1hUrRAzMMDlBMt_3UnZZqnYDpEIRmC3Y',
  Promise: Promise
});

mongodb.connect(mongourl,
 function(err) {
  if (err) {
    throw err;
  }else{
    console.log("connected");
  }
});

app.set('view engine', 'ejs');
mongodb.set('useFindAndModify', false);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  let cars = findAllCars({});
  cars.then(function(result) {
    res.render('calendar', {licensePlateNumber: "A", cars:result});
  });
});

app.get('/getCalendar', (req, res) => {
  let cars = findAllCars({});
  cars.then(function(result) {
    res.render('calendar', {licensePlateNumber: req.query.license, cars:result});
  });
});

app.get('/insertCar', (req, res) => {
  res.render('insertCar');
});

app.post('/insert_carType', (req, res) => {
  const result = Joi.validate(req.body, carTypeScheme); //validate form input
  if(result.error){
    console.log(result.error);
    res.status(400).json(result.error.details[0].message);
  }else {
    var car = new carType(req.body);
    car.save(function (err) {
      if (err) return handleError(err);
      // saved!
      let cars = findAllCars({});
      cars.then(function(result) {
        res.render('calendar', {licensePlateNumber: "A", cars:result});
      });
    });
  }
});

app.post('/insert_order', (req, res) => {
    const result = Joi.validate(req.body, schedulingScheme); //validate form input
    if(result.error){
      console.log(result.error);
      res.status(400).json(result.error.details[0].message);
    }else {
      let event = req.body;
      let bookingDay = event.start - (event.start % 86400000);
      let criteria = {'bookingTime.start': {$gte: bookingDay}};;
      let newEvent = convertReqBody(event);
      const getAllInfo = Promise.all([
        roundEndTime(newEvent),
        findAllCars({}),
        findAllSchedules(criteria)
      ])
      .then(([endTime, cars, schedules]) => {
        newEvent.bookingTime.end = endTime;
        if(schedules.length == 0 && cars.length > 0){
          newEvent.carType.licensePlateNumber = cars[0].licensePlateNumber;
          console.log(newEvent);
          let insert = new phoneNumber(newEvent);
          insert.save(function (err) {
            if (err) return handleError(err);
            // saved!
            res.json("success");
          });
        }else{
          console.log(cars);
          let result = checkTimeConflict(schedules, newEvent, cars); // check time conflict
          if(result.ranges[0].cars.size == 0){
            res.json("Time Conflict");
          }else{
            const iterator1 = result.ranges[0].cars.values();
            newEvent.carType.licensePlateNumber = iterator1.next().value;
            let insert = new phoneNumber(newEvent);
              insert.save(function (err) {
                if (err) return handleError(err);
                // saved!
                res.json("success");
              });
          }
        }
      });
    };
});

app.get('/search', function (req, res) {
	var q = req.query.q;

	// PARTIAL TEXT SEARCH USING REGEX
	phoneNumber.aggregate([
    {
      "$match": {"phoneNumber": {
  			$regex: new RegExp(q)
  		}}
    },
    {
      "$group": {
        "_id": "$phoneNumber", "events": { $last: "$$ROOT" }
      }
    }
  ], function (err, data) {
		res.json(data);
	});
});

app.get('/find_all', function (req, res) {
	phoneNumber.find({'carType.licensePlateNumber':req.query.license}, function (err, data) {
		res.json(data);
	});
});

app.get('/find_event', (req, res) => {
  phoneNumber.find(req.query, function (err, data) {
		res.json(data);
	});
});

app.put('/update/:id', (req,res) => {
  const result = Joi.validate(req.body, schedulingScheme);
    if(result.error){
      res.status(400).json(result.error.details[0].message);
    }else {
      convertReqBody(req.body, (event) => {
        updateDoc(req.params.id, event,(result) => {
          res.json(result);
        });
      });
    }

});

//Update scheduled event
const updateDoc = (id,newDoc, callback) => {
  let criteria = {};
  criteria['_id'] = new ObjectID(id);
  phoneNumber.findOneAndUpdate(criteria, newDoc, { new: true }, function (err, data) {
    assert.equal(null,err);
    callback("success");
  });
}

function convertReqBody(event){
  let new_r = {};
  new_r.bookingName = event.bookingName;
  new_r.start_location = {start_point:event.start_point, lat:event.start_loc_lat, long:event.start_loc_long};
  new_r.destination = {dest:event.destination, lat:event.des_loc_lat, long:event.des_loc_long};
  new_r.bookingTime = {booking:event.bookingTime, start:event.start}
  new_r.carType = {wheelChairNumber: event.wheelChairNumber};
  new_r.phoneNumber = event.phoneNumber;
  new_r.price = event.price;
  new_r.passeger = event.passeger;
  new_r.description = event.description;
  return new_r;
}
//check Timeslot conflict
function checkTimeConflict(schedules, newEvent, cars) {
  /*var sortedRanges = schedules.sort((previous, current) => {
  // get the start date from previous and current
  var previousTime = previous.bookingTime.start;
  var currentTime = current.bookingTime.start;
  // if the previous is earlier than the current
  if (previousTime < currentTime) {
    return -1;
  }
  // if the previous time is the same as the current time
  if (previousTime === currentTime) {
    return 0;
  }
  // if the previous time is later than the current time
  return 1;
});*/

  var result = schedules.reduce((result, previous) => {
    //console.log(arr);
    // get the previous range
    /*console.log(idx);
    if (idx === 0) { return result; }
    var previous = arr[idx-1];
    console.log(previous);*/
    // check for any overlap
    const moment = MomentRange.extendMoment(Moment);
    var range1 = moment.range(new Date(parseInt(newEvent.bookingTime.start)), new Date(newEvent.bookingTime.end));
    var range2 = moment.range(new Date(previous.bookingTime.start), new Date(previous.bookingTime.end));
    var overlap = range1.overlaps(range2)
    // store the result
    if (overlap) {
      cars.delete(previous.carType.licensePlateNumber);
      console.log(cars);
      // yes, there is overlap
      //result.overlap = true;
      // store the specific ranges that overlap
      result.ranges.push({
        cars: cars,
        previous: previous,
        current: newEvent
      })
    }
    return result;
   // seed the reduce
 }, {overlap: false, ranges: [{cars:cars}]});
// return the final results
  return result;
};

//find all schedule records within aday
const findAllSchedules = (criteria) => {
  return new Promise((resolve, reject) => {
    phoneNumber.find(criteria, function (err, data) {
      resolve(data);
    });
  })
}

//find all cars
const findAllCars = (criteria) =>{
  return new Promise((resolve, reject) => {
    let cars = new Set();
    carType.find(criteria, function (err, data) {
      data.forEach((item) => {
        cars.add(item.licensePlateNumber);
      });
      resolve(cars);
    });
  })
};

// Get the driving duration
const calculateDistance = (start, end, callback) => {
  googleMapsClient.distanceMatrix({
    origins: `${start.lat},${start.long}`,
    destinations: `${end.lat},${end.long}`,
    mode: 'driving' //other mode include "walking" , "bicycling", "transit"
  }).asPromise().then((response) => {
    callback(response.json.rows[0].elements[0]);
  })
  .catch(err => console.log(err));
}

// round the end time nearest 5mins
const roundEndTime = (event) => {
  return new Promise((resolve, reject) => {
    calculateDistance(event.start_location, event.destination, (duration) => {
      let time = 5 * 60 * 1000;
      let endTime = parseInt(event.bookingTime.start) + (duration.duration.value * 1000) + (2.5 * 60 * 1000);
      let roundedTime = new Date((Math.round(endTime/time) * time));
      //event['bookingTime.end'] = (roundedTime.getTime() + 28800000); // add UTC 8 hours
      resolve(roundedTime.getTime());
    });
  });
}

const checkShorterRoad = (event1, event2, callback) => {
  calculateDistance(event, (distance) => {
    callback(distance);
  })
}

app.listen(process.env.PORT || 8099);
