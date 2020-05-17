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
  let cars = findAllCars({});
  cars.then(function(result) {
    res.render('insertCar', {licensePlateNumber: "A", cars:result});
  });
});

app.post('/insert_carType', (req, res) => {
  const result = Joi.validate(req.body, carTypeScheme); //validate form input
  if(result.error){
    //console.log(result.error);
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

//new code   result==carsAll==showAllInfo;
app.get('/getCar/:licensePlateNumber', (req, res) => {
	let cars = findAll({});
  cars.then(function(result) {
		let carsAll = new Set();
			carsAll = result;
			let carsName = new Set();
				result.forEach((item) => {
					carsName.add(item.licensePlateNumber);
				})
			result.forEach((i) => {
				if (i.licensePlateNumber == req.params.licensePlateNumber)
					carsAll = i;
			})
    	res.render('manageCars', {licensePlateNumber: req.params.licensePlateNumber, cars: carsName, c:carsAll});
		console.log(carsAll);
		
	
  });
});

//generate report
app.get('/report', (req, res) => {
	let cars = findAll({});
  cars.then((result) => {
  	let carsName = new Set();
  		result.forEach((item) => {
  			carsName.add(item.licensePlateNumber);
  		})
    res.render('report.ejs', {licensePlateNumber: "A", cars: carsName});
	})
});

app.post('/getReport', (req, res) => {
	let cars = findAll({});
  cars.then((result) => {
  	let carsName = new Set();
  		result.forEach((item) => {
  			carsName.add(item.licensePlateNumber);
  		})
	console.log("send submit:")
	let form = new formidable.IncomingForm();
	form.parse(req, (err,fields,files) => {
		
		console.log("return f.s:"+ fields.start); //fields.start type -> string, not Date
		console.log("return f.e:"+ fields.end);
		console.log("return f.s:"+ fields.license);
		console.log("return f.s:"+ fields.reportType);
		
		
	var today = new Date();
	var time = today.getHours().toString() + today.getMinutes().toString() + today.getSeconds().toString();
	var writeStream = fs.createWriteStream(fields.reportType+"_"+fields.license+"_"+time+".xls");
	console.log(fields.reportType+"_"+fields.license+"_"+time+".xls is exported on current folder.")

	let ee = fields.start;
	//console.log("ee: " + ee);
	let yyyy = ee.substr(0,4);
	let mm = ee.substr(5,2);
	let dd = ee.substr(8,2);
	//console.log("start yyyy-mm-dd: " + yyyy +"-"+ mm +"-"+ dd);
	var trueStartDate = new Date(yyyy, mm-1, dd, 0, 0, 0);
	//console.log("trueStartDate:" + trueStartDate);
	var numStartDate = trueStartDate.valueOf();
	//console.log("numStartDate:" + numStartDate);
	
	let ff = fields.end;
	let yyy = ff.substr(0,4);
	let m = ff.substr(5,2);
	let d = ff.substr(8,2);
	//console.log("end yyyy-mm-dd: " + yyy +"-"+ m +"-"+ d);
	var trueEndDate = new Date(yyy, m-1, d, 23, 59, 59);
	//console.log("trueEndDate:" + trueEndDate);
	var numEndDate = trueEndDate.valueOf();
	//console.log("numEndDate:" + numEndDate);
	
	var days = (numEndDate - numStartDate)/86400000;
	console.log("counting " + Math.ceil(days) + " days");

	//new
	var ln = fields.license;
	var cri = ""; //criteria between 13/5/2020 00:00:00 to 15/5/2020 23:59:59
	//find all scheduling
	if (ln == "allCars") {
		cri = {$and:[{'bookingTime.start': {$gte: trueStartDate}}, {'bookingTime.start': {$lt: trueEndDate}}]}; 
	}
	else {
		cri = {$and:[{'bookingTime.start': {$gte: trueStartDate}}, {'bookingTime.start': {$lt: trueEndDate}}, {'carType.licensePlateNumber': ln}]}; 
	}
	
	
	//report type
	if (fields.reportType == "bookingPerDay") {
		let bo = phoneNumber.find(cri, function (err,data) {
			//console.log(data);
			
		//loop
  	var dataUse=[];
  	var regex = /,/gi;
  		for (x in data) {
				dataUse.push(Object.values(data[x].id).toString().replace(regex, '') + 
				Object.values(data[x].start_location) + 
				Object.values(data[x].destination) + 
				Object.values(data[x].bookingTime) + "," +
				Object.values(data[x].carType.wheelChairNumber).toString() + "," +
				Object.values(data[x].carType.licensePlateNumber).toString() + "," +
				Object.values(data[x].bookingName).toString().replace(regex, '') + "," + 
				Object.values(data[x].phoneNumber).toString().replace(regex, '') + ","+
				Object.values(data[x].price).toString() + "," +
				Object.values(data[x].description).toString().replace(regex, '') + "\n");
			}
			/*
			for (y in dataUse) {
				console.log("data in excel["+ y +"]: " + dataUse[y]);}
			*/
			
			var header= "booking ID"+"\t"+"Start point"+"\t"+"Start point(Chinese)"+"\t"+"Start lat"+"\t"+"Start long"+"\t"+"Start district"+"\t"+"End Point"+"\t"+"End Point(Chinese)"+"\t"+"End lat"+"\t"+"End long"+"\t"+"End district"+"\t"+"booking date time"+"\t"+"start"+"\t"+"End"+"\t"+"wheelchair number"+"\t"+"car license plate number"+"\t"+"Name"+"\t"+"phone number"+"\t"+"price"+"\t"+"description"+"\n";
	
			//const cloneSheepsES6 = [...sheeps]; //deep copy
			var row=[];
			row = [...dataUse];
	
			writeStream.write(header);
				for (rr in row) {
			writeStream.write(row[rr]);
				}
			
			writeStream.close();
			})}
		
	
	let curDir = process.cwd();
	console.log("Report is located on " + curDir);
	res.render('calendar', {licensePlateNumber: "A", cars:carsName});
	
})})});

//Edit car
app.get('/editCar/:licensePlateNumber', (req, res) => {
	let cars = findAllCars({});
  cars.then(function(result) {
    res.render('editCar', {licensePlateNumber: req.params.licensePlateNumber, cars: result});
  });
});

//Edited car(update)
app.post('/getCar/:licensePlateNumber', (req, res) => {
	console.log("***Edit car"+ req.params.licensePlateNumber);
	let cars = findAll({});
  cars.then(function(result) {
		let carsAll = new Set();
			carsAll = result;
			result.forEach((i) => {
				if (i.licensePlateNumber == req.params.licensePlateNumber)
					carsAll = i;
			})
		let id= carsAll._id;	
	let form = new formidable.IncomingForm();
	form.parse(req, (err,fields,files) => {
	let licensePlateNumber = req.params.licensePlateNumber;
		carType.findOne({_id:id}, (err, result) =>{
			assert.equal(err,null);
			console.log("return:"+ result);
			console.log("return r.d:"+ result.description);
			console.log("return f.d:"+ fields.description);
			
			result.description = fields.description;
			console.log("Edit description"+ fields.description);
			result.wheelChairNumber = fields.wheelChairNumber;
			console.log("Edit wheelChairNumber"+ fields.wheelChairNumber);
			result.passegerNumber = fields.passegerNumber;
			console.log("Edit passegerNumber"+ fields.passegerNumber);
				result.save((err,updatedResult) => {
					assert.equal(err,null);
					res.status(302).redirect(`/getCar/${licensePlateNumber}`);
				
		})})
		})
	})
});

//delete car
app.get('/managerCar/:licensePlateNumber', (req,res) => {
	console.log("***Delete car"+ req.params.licensePlateNumber);
	let cars = findAll({});
  cars.then(function(result) {
		let carsAll = new Set();
			carsAll = result;
			result.forEach((i) => {
				if (i.licensePlateNumber == req.params.licensePlateNumber)
					carsAll = i;
			})
		let id= carsAll._id; //the car is going to be deleted
		carType.findOne({_id:id}, (err, carid) => {
			console.log("del: "+carid)
		carType.findByIdAndDelete(id, (error) =>{
			assert.equal(error,null);
			});
			let cars = findAllCars({});
  		cars.then(function(resultt) {
			res.render('calendar', {licensePlateNumber: "A", cars:resultt});
			console.log(resultt);
		})})
	})
});

app.post('/insert_order', (req, res) => {
    const result = Joi.validate(req.body, schedulingScheme); //validate form input
    if(result.error){
      //console.log(result.error);
      res.status(400).json(result.error.details[0].message);
    }else {
      let event = req.body;
      console.log(new Date (parseInt(event.start)));
      let bookingDay = event.start - (event.start % 86400000);
      let afterDay = bookingDay + (24 * 60 * 60 * 1000);
      console.log(new Date(bookingDay));
      let criteria = {'bookingTime.start': {$gte: bookingDay, $lte:afterDay}};;
      let newEvent = convertReqBody(event);
      const getAllInfo = Promise.all([
        roundEndTime(newEvent),
        findAllCars({}),
        findAllSchedules(criteria)
      ])
      .then(([endTime, cars, schedules]) => {
        newEvent.bookingTime.end = endTime;
        if(schedules.length == 0 && cars.size > 0){
          const iterator1 = cars.values();
          newEvent.carType.licensePlateNumber = iterator1.next().value;;
          //console.log(newEvent);
          let insert = new phoneNumber(newEvent);
          insert.save(function (err) {
            if (err) return handleError(err);
            // saved!
            res.json({success:"success", car:newEvent.carType.licensePlateNumber});
          });
        }else{
          //console.log(cars);
          let result = checkTimeConflict(schedules, newEvent, cars); // check time conflict
          if(result.ranges[0].cars.size !=0){
            checkShorterRoad(schedules, newEvent, result.ranges[0].cars, callback =>{
              if(callback.length !=0){
                newEvent.carType.licensePlateNumber = callback[0].carType;
                let insert = new phoneNumber(newEvent);
                  insert.save(function (err) {
                    if (err) return handleError(err);
                    // saved!
                    res.json({success:"success", car:newEvent.carType.licensePlateNumber});
                  });
              }else{
                const iterator1 = result.ranges[0].cars.values();
                newEvent.carType.licensePlateNumber = iterator1.next().value;
                let insert = new phoneNumber(newEvent);
                  insert.save(function (err) {
                    if (err) return handleError(err);
                    // saved!
                    res.json({success:"success", car:newEvent.carType.licensePlateNumber});
                  });
              }
            })
          }else{
            res.json("Time Conflict");
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

app.get('/getPrice', (req, res) => {
  let start = {};
  let end = {};
  start.lat = req.query.startlat;
  start.long = req.query.startlong;
  end.lat = req.query.endlat;
  end.long = req.query.endlong;
  calculateDistance(start,end, (result) => {
    let distance = result.distance.value;
    let price = 24;
    let t = (distance - 2000)%200;
    console.log(t);
    console.log(distance);
    if(distance < 2000){
      res.json({"price":price});
    }else{
      for(let i =0; i<t; i++){
        if(price < 83.5){
          price += 1.7;
        }else{
          price += 1.2;
        }
      }
      res.json({"price":Math.round(price*10)/10});
    }
  })
});

app.put('/update/:id', (req,res) => {
  console.log(req.body);
  const result = Joi.validate(req.body, schedulingScheme);
    if(result.error){
      res.status(400).json(result.error.details[0].message);
    }else {
      let events = convertReqBody(req.body);
      updateEvent(events, (check) =>{
        console.log(check);
        if(check != "Time Conflict"){
          updateDoc(req.params.id, check,(result) => {
            console.log(result);
            res.json(result);
          });
        }
      });
      /*updateDoc(req.params.id, events,(result) => {
        console.log(result);
        res.json(result);
      });*/
    }

});

const updateEvent = (event, callback) => {
  let bookingDay = event.bookingTime.start - (event.bookingTime.start % 86400000);
  let afterDay = bookingDay + (24 * 60 * 60 * 1000);
  console.log(new Date(bookingDay));
  let criteria = {'bookingTime.start': {$gte: bookingDay, $lte:afterDay}};;
  const getAllInfo = Promise.all([
    roundEndTime(event),
    findAllCars({}),
    findAllSchedules(criteria)
  ])
  .then(([endTime, cars, schedules]) => {
    console.log(schedules.length);
    console.log(cars);
    event.bookingTime.end = endTime;
    if(schedules.length == 0 && cars.size > 0){
      const iterator1 = cars.values();
      event.carType.licensePlateNumber = iterator1.next().value;;
      callback(event);
    }else{
      //console.log(cars);
      let result = checkTimeConflict(schedules, event, cars); // check time conflict
      if(result.ranges[0].cars.size !=0){
        checkShorterRoad(schedules, event, result.ranges[0].cars, (shortedResult) =>{
          console.log(shortedResult);
          if(callback.length !=0){
            event.carType.licensePlateNumber = shortedResult[0].carType;
            //console.log(event);
            callback(event);
          }else{
            const iterator1 = result.ranges[0].cars.values();
            event.carType.licensePlateNumber = iterator1.next().value;
            console.log(event);
            callback(event);
          }
        })
      }else{
        callback("Time Conflict");
      }
    }
  });

}
//Update scheduled event
const updateDoc = (id,newDoc, callback) => {
  let criteria = {};
  criteria['_id'] = new ObjectID(id);
  phoneNumber.findOneAndUpdate(criteria, newDoc, { new: true }, function (err, data) {
    assert.equal(null,err);
    let result = {};
    result.success = "success";
    result.car = newDoc.carType.licensePlateNumber;
    callback(result);
  });
}

function convertReqBody(event){
  let new_r = {};
  new_r.bookingName = event.bookingName;
  new_r.start_location = {start_point:event.start_point, lat:event.start_loc_lat, long:event.start_loc_long, start_district:event.start_district};
  new_r.destination = {dest:event.destination, lat:event.des_loc_lat, long:event.des_loc_long, end_district:event.end_district};
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

//find all car's details
//new code
const findAll = (criteria) =>{
  return new Promise((resolve, reject) => {
    let cars = new Set();
    carType.find(criteria, function (err, data) {
      data.forEach((item) => {
        	cars.add(item);
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

function cd(start, end){
  googleMapsClient.distanceMatrix({
    origins: `${start.lat},${start.long}`,
    destinations: `${end.lat},${end.long}`,
    mode: 'driving' //other mode include "walking" , "bicycling", "transit"
  }).asPromise().then((response) => {
    return response.json.rows[0].elements[0];
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

const sortRange = (result, callback) => {
  var sortedRanges = result.sort((previous, current) => {
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
  });
  callback(sortedRanges);
};

const sortDuration = (result, callback) => {
  var sortedRanges = result.sort((previous, current) => {
    // get the start date from previous and current
    var previousTime = previous.duration;
    var currentTime = current.duration;
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
  callback(sortedRanges);
};

const checkShorterRoad = (schedules, newEvent, noConflictCar, callback) => {
  const iterator1 = noConflictCar.values();
  let tm = 60 * 1000 * 60;
  let durationArray = [];
  let count = 0;
  let total = noConflictCar.size;
  for(let i=0; i < noConflictCar.size; i++){
    let tempArray = [];
    let temp = iterator1.next().value;
    let result = schedules.filter(carSchedule => (carSchedule.carType.licensePlateNumber == temp));
    result.push(newEvent);
    console.log(result.length);
    if(result.length > 1){
      sortRange(result, (sortedRanges) => {
        const index = (element) => element.bookingTime.start == newEvent.bookingTime.start;
        let p = sortedRanges.findIndex(index);
        if(p !=0){
          for (let i =0; i < 2; i++){
            let size = sortedRanges[p].bookingTime.start - sortedRanges[p-1].bookingTime.end;
            let size2 = sortedRanges[p+1].bookingTime.start - sortedRanges[p].bookingTime.end;
            if(size < tm && size2 < tm){
              calculateDistance(sortedRanges[p+1].start_location, sortedRanges[p].destination, (duration) =>{
                let plate = {};
                plate.carType = sortedRanges[p+1].carType.licensePlateNumber;
                plate.duration = duration.duration.value;
                plate.distance = duration.distance.value;
                durationArray.push(plate);
              });
              calculateDistance(sortedRanges[p].start_location, sortedRanges[p-1].destination, (duration) =>{
                let plate = {};
                plate.carType = sortedRanges[p-1].carType.licensePlateNumber;
                plate.duration = duration.duration.value;
                plate.distance = duration.distance.value;
                durationArray.push(plate);
                count++;
                if(count == total*2){
                  sortDuration(durationArray, (sortedDuration) => {
                    callback(sortedDuration);
                  })

                }
              });
            }else if(size < tm){
              tempArray.push(sortedRanges[p]);
              tempArray.push(sortedRanges[p-1]);
              calculateDistance(tempArray[0].start_location, tempArray[1].destination, (duration) =>{
                let plate = {};
                plate.carType = tempArray[1].carType.licensePlateNumber;
                plate.duration = duration.duration.value;
                plate.distance = duration.distance.value;
                durationArray.push(plate);
                count++;
                if(count == total){
                  sortDuration(durationArray, (sortedDuration) => {
                    callback(sortedDuration);
                  })

                }
              });
            }else if(size2 < tm){
              tempArray.push(sortedRanges[p]);
              tempArray.push(sortedRanges[p+1]);
              calculateDistance(tempArray[1].start_location, tempArray[0].destination, (duration) =>{
                let plate = {};
                plate.carType = tempArray[1].carType.licensePlateNumber;
                plate.duration = duration.duration.value;
                plate.distance = duration.distance.value;
                durationArray.push(plate);
                count++;
                if(count == total){
                  sortDuration(durationArray, (sortedDuration) => {
                    callback(sortedDuration);
                  })

                }
              });
            }
          }
        }else{
          let size = sortedRanges[p+1].bookingTime.start - sortedRanges[p].bookingTime.end;
          if(size < tm) {
            tempArray.push(sortedRanges[p]);
            tempArray.push(sortedRanges[p+1]);
            calculateDistance(tempArray[1].start_location, tempArray[0].destination, (duration) =>{
              let plate = {};
              plate.carType = tempArray[1].carType.licensePlateNumber;
              plate.duration = duration.duration.value;
              plate.distance = duration.distance.value;
              durationArray.push(plate);
              count++;
              if(count == total){
                sortDuration(durationArray, (sortedDuration) => {
                  callback(sortedDuration);
                })

              }
            });
          }else{
            let plate ={};
            const iterator2 = noConflictCar.values();
            plate.carType = iterator2.next().value;
            durationArray.push(plate);
            callback(durationArray);
          }
        }
      });
    }
  }

  //let resutl1 = schedules.filter(car => );
}

app.listen(process.env.PORT || 8097);
