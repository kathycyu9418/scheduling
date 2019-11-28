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
  res.sendFile(__dirname +'/views/calendar.html');
});

app.post('/insert_order', (req, res) => {
  console.log(req.body);
    const result = Joi.validate(req.body, schedulingScheme);
    if(result.error){
      console.log(result.error);
      res.status(400).json(result.error.details[0].message);
    }else {
      let events = new phoneNumber(req.body);
      events.save(function (err) {
        if (err) return handleError(err);
        // saved!
        res.json("success");
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
  //console.log(req.params.id)
  console.log(req.body);

  const result = Joi.validate(req.body, schedulingScheme);
    if(result.error){
      console.log(result.error);
      res.status(400).json(result.error.details[0].message);
    }else {
      updateDoc(req.params.id,req.body,(result) => {
        console.log(result);
        res.json(result);
      });
    }

});

const updateDoc = (id,newDoc, callback) => {
  let criteria = {};
  criteria['_id'] = new ObjectID(id);
  phoneNumber.findOneAndUpdate(criteria, newDoc, { new: true }, function (err, data) {
    assert.equal(null,err);
    console.log(data);
    callback("success");
  });
}
app.listen(process.env.PORT || 8099);
