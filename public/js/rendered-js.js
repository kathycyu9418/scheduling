function timePicker(start, end) {
  $('input[name="bookingTime"]').daterangepicker({
    timePicker: true,
    startDate: moment(start).format('MM-DD HH:mm'),
    endDate: moment(end).format('MM-DD HH:mm'),
    locale: {
      format: 'M-DD hh:mm A'
    }
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
      $("#userid").val(events.userid);
      $("#bookingName").val(events.bookingName);
      $("#start_search_input").val(events.start_point);
      $("#start_loc_lat").val(events.start_loc_lat);
      $("#start_loc_long").val(events.start_loc_long);
      $("#des_search_input").val(events.destination);
      $("#des_loc_lat").val(events.des_loc_lat);
      $("#des_loc_long").val(events.des_loc_long);
      $("#phoneNumber").val(events.phoneNumber);
      $("#price").val(events.price);
      $("#clientName").val(events.clientName);
      $("#description").val(events.description);
      if($("#submit").val() == "update") {
        $("#bookingTime").val(events.bookingTime);
        $("#start").val(events.start);
        $("#end").val(events.end);
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
      msg = "Inserted Success!"
      var response = await fetch('insert_order', {
        method: 'POST',
        body: data,
        headers: { 'Accept' : 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
      });
    }
    let result = await response.json();
    if(result == "success"){
      alert(msg);
      document.getElementById("myModal").style.display = "none";
      $("#scheduling")[0].reset();
      $("#calendar").fullCalendar("updateEvent", 'events');
      $("#calendar").fullCalendar('refetchEvents');
    };
  };
};

$(document.getElementsByClassName("close")[0]).click(function() {
  var modal = document.getElementById("myModal"); // Get the modal
  modal.style.display = "none";// When the user clicks on <span> (x), close the modal
})

$(window).click(function(event) {
var modal = document.getElementById("myModal"); // Get the modal
  if (event.target == modal) {
    modal.style.display = "none";// When the user clicks anywhere outside of the modal, close it
  }
})

$(document).ready(function () {
$("#calendar").fullCalendar({
  timeZone: 'local',
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

//event select
select: function (start, end) {
var view = $('#calendar').fullCalendar('getView');
if(view.name == "agendaDay" || view.name == "agendaWeek"){
  var modal = document.getElementById("myModal"); // Get the modal
  modal.style.display = "block";
  }
  //set time picker
  document.getElementById("bookingTime").addEventListener('click', timePicker(start, end));
  console.log(start.valueOf());
  $('#bookingTime').on('apply.daterangepicker', function(ev, picker) {
    console.log(picker.startDate.valueOf());
    var startDate = startDate.valueOf();
    var endDate = parseInt(picker.endDate.valueOf() + 28800000);
    events[0].start = startDate;
    events[0].end = endDate;
  });
  document.getElementById("start").value= start.valueOf();
  document.getElementById("end").value= end.valueOf();
  //submit without reload
  document.getElementById("scheduling").onsubmit = async (e) => {
    e.preventDefault();
    var data = $('form').serialize();
    let response = await fetch('insert_order', {
      method: 'POST',
      body: data,
      headers: { 'Accept' : 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'}
    });
    let result = await response.json();
    if(result == "success"){
      alert("Success");
      modal.style.display = "none";
      $("#scheduling")[0].reset();
      $("#calendar").fullCalendar('addEventSource', 'events');
      $("#calendar").fullCalendar('refetchEvents');
    };
    }

    $("#calendar").fullCalendar("unselect");
  },

//day click
dayClick: function (date) {
  $('#calendar').fullCalendar('changeView', 'agendaDay');
  $('#calendar').fullCalendar('gotoDate', date);
},

  eventRender: function (event, element) {
    element.find('.fc-title').append("<br/>" + event.description);
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
    document.getElementById("bookingTime").addEventListener('click', timePicker((parseInt(events[0].start) - 28800000), (parseInt(events[0].end) - 28800000)));
    $('#bookingTime').on('apply.daterangepicker', function(ev, picker) {
      var startDate = (parseInt(picker.startDate.valueOf()) + 28800000);
      var endDate = (parseInt(picker.endDate.valueOf()) + 28800000);
      document.getElementById("start").value= startDate;
      document.getElementById("end").value = endDate;
      console.log(document.getElementById("start").value);
    });
    fillValues(events[0]);
    submitForm(calEvent.id);
    document.getElementById("myModal").style.display = "block";
  },

  events: async (start, end, timezone, callback) => {
    let response = await fetch('find_all', {
      method: 'get',
      headers: { 'Content-Type': 'application/json' }
    });
    let result = await response.json();
    let events = [];
    result.forEach((doc) => {
      let name = `Name: ${doc.bookingName} (${doc.phoneNumber})`;
      let description =  `Location: ${doc.start_point} TO ${doc.destination}<br> Price: ${doc.price}`;
      let start = doc.start;
      let end = doc.end;
      let id = doc._id;
      console.log(id);
      events.push({
        id: id,
        title:name,
        description: description,
        start: start,
        end: end
      });
    });
    callback(events);
    },
});


});
