function showForm(){
  var modal = document.getElementById("myModal"); // Get the modal
  document.getElementById("bookingEndTime").style.display = "none";
  modal.style.display = "block";// When the user clicks on <span> (x), close the modal
  var start = new Date();
  let startTime = roundTime(start.getTime());
  document.getElementById("start").value = (startTime.getTime() + 28800000);
  document.getElementById("bookingTime").addEventListener('click', timePicker(startTime));
  submitForm();
}

function roundTime(startTime) {
  let time = 5 * 60 * 1000;
  startTime = startTime + (2.5 * 60 * 1000);
  let roundedTime = new Date(Math.round(startTime/time) * time);
  return roundedTime;
}


function timePicker(start) {
  $('input[name="bookingTime"]').daterangepicker({
    singleDatePicker: true,
    timePicker: true,
    startDate: moment(start).format('MM-DD HH:mm'),
    locale: {
      format: 'MM-DD HH:mm'
    }
  });

  $('#bookingTime').on('apply.daterangepicker', function(ev, picker) {
    var startDate = (parseInt(picker.startDate.valueOf()) + 28800000);
    console.log(new Date(startDate));

    document.getElementById("start").value= startDate;
  });

};
//get the search result from db
var showResults = debounce(function (arg) {
  var value = arg.trim();
  if (value == "" || value.length <= 0) {
    $("#search-results").fadeOut();
    return;
  } else {
    $("#search-results").fadeIn();
  };
  var jqxhr = $.get('/search?q=' + value, function (data) {
      $("#search-results").html("");
    })
    .done(function (data) {
      if (data.length === 0) {
        $("#search-results").append('<p>No results</p>');
      } else {
        data.forEach(x => {
          $("#search-results").append(`<p class="anyclass" >${x._id}</p>`);//search result
        });
        $('.anyclass').click(function() {
          $("#search-results").fadeOut();
          for(i in data) {
            if(data[i]._id == $(this).text()){
              fillValues(data[i].events);
            }
          }
        });
      }
    })
    .fail(function (err) {
      console.log(err);
    })
}, 300);
//set the value to form(last record)
function fillValues(events) {
      $("#bookingName").val(events.bookingName);
      $("#start_district").val(events.start_location.start_district);
      $("#end_district").val(events.destination.end_district);
      $("#start_search_input").val(events.start_location.start_point);
      $("#start_loc_lat").val(events.start_location.lat);
      $("#start_loc_long").val(events.start_location.long);
      $("#des_search_input").val(events.destination.dest);
      $("#des_loc_lat").val(events.destination.lat);
      $("#des_loc_long").val(events.destination.long);
      $("#phoneNumber").val(events.phoneNumber);
      $("#price").val(events.price);
      $("#clientName").val(events.passeger);
      $("#description").val(events.description);
      if($("#submit").val() == "update") {
        $("#bookingTime").val(events.bookingTime.booking);
        $("#start").val(events.bookingTime.start);
        $("#endInput").val(moment((events.bookingTime.end - 28800000)).format('MM-DD HH:mm'));
        document.getElementById("bookingEndTime").style.display = "block";
        $("#end").val(events.bookingTime.end);
      }
};

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this,
      args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

function submitForm(criteria){
  document.getElementById("scheduling").onsubmit = async (e) => {
    document.getElementById("myModal").style.display = "none";
    e.preventDefault();
    var data = $('form').serialize();
    var msg;
    if($("#submit").val() == "update"){
      msg = "Update Success!";
      var response = await fetch(`update/${criteria}`, {
        method: 'PUT',
        body: data,
        headers: { 'Accept' : 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
      });
    }else{
      msg = "Inserted Success"
      var response = await fetch('insert_order', {
        method: 'POST',
        body: data,
        headers: { 'Accept' : 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
      });
    }
    let result = await response.json();
    if(result.success == "success"){
      alert(`Inserted to car ${result.car}!`);
      document.getElementById("myModal").style.display = "none";
      $("#submit").val("submit");
      $("#scheduling")[0].reset();
      $("#calendar").fullCalendar("updateEvent", 'events');
      $("#calendar").fullCalendar('refetchEvents');
    }else{
      document.getElementById("myModal").style.display = "block";
      alert(result);
    };
  };
};

$(document.getElementsByClassName("close")[0]).click(function() {
  var modal = document.getElementById("myModal"); // Get the modal
  modal.style.display = "none";// When the user clicks on <span> (x), close the modal
  $("#submit").val("submit");
})

//handle calendar
$(document).ready(function () {
$("#calendar").fullCalendar({
  header: {
    left: "prev,next today",
    center: "title",
    right: "month,agendaWeek,agendaDay" },

  defaultView: "agendaDay",
  navLinks: true, // can click day/week names to navigate views
  selectable: true,
  selectHelper: false,
  editable: true,
  eventLimit: true, // allow "more" link when too many events
  timeZone: 'Asia/Taipei',
  contentHeight: 700,

//event select
select: function (start, end) {
var view = $('#calendar').fullCalendar('getView');
if(view.name == "agendaDay" || view.name == "agendaWeek"){
  var modal = document.getElementById("myModal"); // Get the modal
  modal.style.display = "block";
  }
  document.getElementById("start").value = start.valueOf();
  //set time picker`
  document.getElementById("bookingTime").addEventListener('click', timePicker(start, end));
  //submit without reload
  submitForm();
  $("#calendar").fullCalendar("unselect");
  },

//day click
dayClick: function (date) {
  $('#calendar').fullCalendar('changeView', 'agendaDay');
  $('#calendar').fullCalendar('gotoDate', date);
},

  eventRender: function (event, element) {
    element.find('.fc-title').append("<br/>" + event.description);
    $(element).css('font-size', '1em');
    var view = $('#calendar').fullCalendar('getView');
    if(view.name == 'agendaDay'){
      $(element).css('min-height', '100px');
    }
    //$(element).css('min-height', '100px');
    /*element.find(".fc-content").
    prepend("<span class='closeon material-icons'>&#xe5cd;</span>");
    /*element.popover({
      title: event.title,
      content: event.description,
      trigger: 'hover',
      html: true,
      placement: 'top',
      container: 'body'
    });*/
    /*element.find(".closeon").on("click", function () {
      $("#calendar").fullCalendar("removeEvents", event._id);
    });*/
  },

  eventClick: async function (calEvent) {
    let response = await fetch(`find_event?_id=${calEvent.id}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json' }
    });
    let events = await response.json();
    $("#submit").val("update");
    fillValues(events[0]);
    document.getElementById("myModal").style.display = "block";
    document.getElementById("bookingTime").addEventListener('click', timePicker((parseInt(events[0].bookingTime.start) - 28800000)));
    submitForm(calEvent.id);
  },
  events: async (start, end, timezone, callback) => {
    //console.log(document.getElementById("calenderName").innerHTML);
    let response = await fetch(`find_all?license=${document.getElementById("calenderName").innerHTML}`, {
      method: 'get',
      headers: { 'Content-Type': 'application/json' }
    });
    let result = await response.json();
    let events = [];
    var color = 'red';
    result.forEach((doc) => {
      //console.log(doc);
      let name = `Name: ${doc.bookingName} (${doc.phoneNumber})`;
      let description =  `Location: ${doc.start_location.start_point} TO ${doc.destination.dest}<br> Price: ${doc.price}`;
      let start = doc.bookingTime.start;
      let end = doc.bookingTime.end;
      let id = doc._id;
      if(doc.destination.end_district == '新界' || doc.destination.end_district == 'New Territories'){
        console.log(color);
        color = "green";
      }else if(doc.destination.end_district == '香港島' || doc.destination.end_district == 'Hong Kong Island'){
        color = "blue";
      }else{
        color = 'red';
      }
      events.push({
        id: id,
        title:name,
        description: description,
        start: start,
        end: end,
        color: color,
        textColor: 'white'
      });
    });
    callback(events);
    },
    timezone: 'Asia/Taipei'
});


});
