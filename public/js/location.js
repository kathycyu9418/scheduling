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
      let len = near_place.address_components.length - 2;
      let district = near_place.address_components[len];
      var lat = near_place.geometry.location.lat();
      var long = near_place.geometry.location.lng();
      document.getElementById('start_district').value = district.long_name;
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

    google.maps.event.addListener(desAutocomplete, 'place_changed', async function () {
      var des_near_place = desAutocomplete.getPlace();
      let len = des_near_place.address_components.length - 2;
      let district = des_near_place.address_components[len];
      console.log(district);
      document.getElementById('end_district').value = district.long_name;
      document.getElementById('des_loc_lat').value = des_near_place.geometry.location.lat();
      document.getElementById('des_loc_long').value = des_near_place.geometry.location.lng();

      if(document.getElementById('start_loc_lat').value !="" && document.getElementById('start_loc_long').value !="" && document.getElementById('des_loc_lat').value !="" && document.getElementById('des_loc_long').value !=""){

        let response = await fetch(`getPrice?startlat=${document.getElementById('start_loc_lat').value}&startlong=${document.getElementById('start_loc_long').value}&endlat=${document.getElementById('des_loc_lat').value}&endlong=${document.getElementById('des_loc_long').value}`, {
          method: 'get',
          headers: { 'Content-Type': 'application/json' }
        });
        let result = await response.json();
        document.getElementById('price').value = result.price;
      }
    });
});
