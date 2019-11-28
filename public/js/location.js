var startSearchInput = 'start_search_input';
var desSearchInput = 'des_search_input';
// enables start point autocomplete places search feature
$(document).ready(function () {
    var autocomplete;
    autocomplete = new google.maps.places.Autocomplete((document.getElementById(startSearchInput)), {
      types: ['geocode'],
      componentRestrictions: {
        country: "HK"
      }
    });
    google.maps.event.addListener(autocomplete, 'place_changed', function () {
      var near_place = autocomplete.getPlace();
      var lat = near_place.geometry.location.lat();
      var long = near_place.geometry.location.lng();
      document.getElementById('start_loc_lat').value = lat;
      document.getElementById('start_loc_long').value = long;
    });

});
// enables Destination autocomplete places search feature
$(document).ready(function () {
    var desAutocomplete;

    desAutocomplete = new google.maps.places.Autocomplete((document.getElementById(desSearchInput)), {
      types: ['geocode'],
      componentRestrictions: {
        country: "HK"
      }
    });

    google.maps.event.addListener(desAutocomplete, 'place_changed', function () {
      var des_near_place = desAutocomplete.getPlace();
      document.getElementById('des_loc_lat').value = des_near_place.geometry.location.lat();
      document.getElementById('des_loc_long').value = des_near_place.geometry.location.lng();

    });
});
