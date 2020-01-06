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
var mongodb = require('mongoose');
var phoneNumber= require(__dirname + "/number");
var distance = require('google-distance-matrix');

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
  res.render('calendar');
});


app.post('/insert_order', (req, res) => {
    const result = Joi.validate(req.body, schedulingScheme); //validate form input
    if(result.error){
      console.log(result.error);
      res.status(400).json(result.error.details[0].message);
    }else {
      var event = new phoneNumber(req.body);
      roundEndTime(event, (newEvent) => { // driving duration + start time -> round the total as end tiem
        findAllSchedules((allEvent) => {
          allEvent.push(newEvent);
          console.log(allEvent);
          let result = checkTimeConflict(allEvent); // check time conflict
          console.log(result.overlap);
          if(result.overlap){
            res.json("Time Conflict");
          }else{
            newEvent.save(function (err) {
              if (err) return handleError(err);
              // saved!
              res.json("success");
            });
          }
        });
      });
    };
});

app.get('/search', function (req, res) {
	var q = req.query.q;
  console.log(q)

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
    console.log(data);
		res.json(data);
	});
});

app.get('/find_all', function (req, res) {

	// PARTIAL TEXT SEARCH USING REGEX
	phoneNumber.find({}, function (err, data) {
		res.json(data);
	});
});

app.get('/find_event', (req, res) => {
  console.log(req.query);
  phoneNumber.find(req.query, function (err, data) {
		res.json(data);
	});
});

app.put('/update/:id', (req,res) => {
  const result = Joi.validate(req.body, schedulingScheme);
    if(result.error){
      console.log(result.error);
      res.status(400).json(result.error.details[0].message);
    }else {
      updateDoc(req.params.id,req.body,(result) => {
        res.json(result);
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

//check Timeslot conflict
function checkTimeConflict(callback) {
  var sortedRanges = callback.sort((previous, current) => {
  // get the start date from previous and current
  var previousTime = previous.start;
  var currentTime = current.start;
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
});

var result = sortedRanges.reduce((result, current, idx, arr) => {
  // get the previous range
  if (idx === 0) { return result; }
  var previous = arr[idx-1];
  // check for any overlap
  var previousEnd = previous.end;
  var currentStart = current.start;
  var overlap = (previousEnd > currentStart);
  // store the result
  if (overlap) {
    // yes, there is overlap
    result.overlap = true;
    // store the specific ranges that overlap
    result.ranges.push({
      previous: previous,
      current: current
    })
  }
  return result;
   // seed the reduce
}, {overlap: false, ranges: []});
// return the final results
 return result;
};

//find all schedule records
const findAllSchedules = (callback) => {
  phoneNumber.find({}, function (err, data) {
    callback(data);
	});
}

// Get the driving duration
const calculateDistance = (event, callback) => {
  distance.key('AIzaSyB1hUrRAzMMDlBMt_3UnZZqnYDpEIRmC3Y');
  distance.mode('driving');
  console.log(event.start_loc_lat);
  origins = [event.start_point, event.start_loc_lat, event.start_loc_long];
  destinations = [event.destination, event.des_loc_lat, event.des_loc_long];
  distance.matrix(origins, destinations, function (err, distances) {
    if (!err)
        if(distances.rows[0].elements[0].status == 'OK') {
          callback(distances.rows[0].elements[0].duration.value);
        };
 });
}

// round the end time nearest 5mins
const roundEndTime = (event, callback) => {
  calculateDistance(event, (duration) => {
    console.log(event.start);
    let time = 5 * 60 * 1000;
    let endTime = event.start + (duration * 1000) + (2.5 * 60 * 1000);
    let roundedTime = new Date(Math.round(endTime/time) * time);
    event['end'] = (roundedTime.getTime() + 28800000); // add UTC 8 hours
    callback(event);
  });
}
app.listen(process.env.PORT || 8099);
