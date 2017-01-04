'use strict';

var map;
var placeService;
var elevationService;
var infoWindow;
var infoWindowContent;
var mapMarkers = [];






/**
 * KnockoutJS dynamic list handling
 */

var ListMarker = function(data) {

    this.name = data.name;
    this.elevation = ko.observable(data.elevation);
    this.placeId = data.placeId;
    this.address = data.address;
    this.rating = data.rating;
    this.openNow = data.openNow;
};

var ViewModel = function() {
    var self = this;
    // Observables for item lists
    self.markerData = ko.observableArray([]);

    // Observables for search filters
    self.openNow = ko.observable(false);
    self.elevations = ko.observableArray(['unknown', 'low', 'med', 'high']);
    self.ratingMin = ko.observable(false);
    self.searchText = ko.observable('');

    // Observables for map elevation legend
    self.legendElevMax = ko.observable();
    self.legendElevMid = ko.observable();
    self.legendElevMin = ko.observable();
    self.showLegend = ko.observable(false); // Legend hidden by default

    self.filteredList = ko.computed(function() {
        var currentList = self.markerData();

        if (self.openNow()) {
            currentList = currentList.filter(function(item) {
                return item.openNow === true;
            });
        }

        currentList = currentList.filter(function(item) {
            return self.elevations().includes(item.elevation());
        });

        if (self.ratingMin()) {
            currentList = currentList.filter(function(item){
                return item.rating >= self.ratingMin();
            });
        }

        if (self.searchText()) {

            // Serialize list for searching
            var fuseSearchArry = [];
            currentList.forEach(function(item){
                var obj = {
                    name: item.name(),
                    address: item.address,
                    placeId: item.placeId
                };
                fuseSearchArry.push(obj);
            });

            // Configure options for FuseJS search
            var searchOptions = {
                shouldSort: true,
                tokenize: true,
                findAllMatches: true,
                threshold: 0.3,
                location: 0,
                distance: 100,
                maxPatternLength: 32,
                minMatchCharLength: 1,
                keys: [
                    "name",
                    "address"
                ]
            };
            // Initialize FuseJS library for searching place names/addresses
            var fuse = new Fuse(fuseSearchArry, searchOptions);
            var result = fuse.search(self.searchText());
            // Hide map markers that are not present in list
            var fusePlaceIds = result.map(function(item){
                return item.placeId;
            });
            hideSpecifiedMarkers(fusePlaceIds);

            return result;
        }

        // Hide map markers that are not present in list
        var placeIds = currentList.map(function(item){
            return item.placeId;
        });
        hideSpecifiedMarkers(placeIds);

        return currentList;
    }, this);

    self.openMapInfoWindow = function(listItem) {
        openInfoWindow(listItem.placeId);
    };

    self.addGoogleListItem = function(googlePlace) {
        var itemData = {
            name: googlePlace.name,
            placeId: googlePlace.place_id,
            rating: googlePlace.rating,
            address: googlePlace.vicinity,
            elevation: 'unknown'
        };

        if (googlePlace.opening_hours) {
            itemData.openNow = googlePlace.opening_hours.open_now;
        }

        self.markerData.push(new ListMarker(itemData));
    };

    // Remove all list items corresponding to an array of placeIds
    self.removeGoogleListItems = function(placeIds) {
        self.markerData.remove(function(listItem) {
            return placeIds.includes(listItem.placeId);
        });
    };

    // Updates knockoutJS list items with elevation rating from Google API call
    self.addGoogleElevation = function(placeId, elevationRating) {
        for (var i = 0; i < self.markerData().length; i++) {
            var place = self.markerData()[i];
            if (place.placeId == placeId) {
                place.elevation(elevationRating);
                break;
            }
        }
    };

    self.setMapLegendRange = function(elevMax, elevMid, elevMin) {
        self.legendElevMax('~' + elevMax + 'm');
        self.legendElevMid('~' + elevMid + 'm');
        self.legendElevMin('~' + elevMin + 'm');
        self.showLegend(true);
    };
};


var viewModel = new ViewModel();
ko.applyBindings(viewModel);






/**
 * Google Map API and Marker handling
 */

function initMap() {
    map = new google.maps.Map(document.getElementsByClassName('map')[0], {
        center: {lat: 47.606, lng: -122.332},
        zoom: 13,
        stylers: [{
            stylers: [{visibility: 'simplified'}]
        }, {
            elementType: 'labels',
            stylers: [{visibility: 'off'}]
        }]
    });

    placeService = new google.maps.places.PlacesService(map);
    elevationService = new google.maps.ElevationService;

    // Position custom legend. Starts hidden, and is shown if elevation
    // data is successfully retrieved
    var elevLegend = document.getElementsByClassName('elevLegend')[0];
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(elevLegend);

    // Search for bike shops once map idle
    map.addListener('idle', getPlaceIds);

    // Alert user of error if elevation or place information does not load
    window.setTimeout(function() {
        if (!mapMarkers.toString()) {
            alert('Error: Location details could not be retrieved. ' +
                  'Please try again later.');
        } else {
            if (typeof mapMarkers[0].elevation == 'undefined') {
                alert('Error: Could not obtain elevation data');
            }
        }
    }, 8000);
}

function getPlaceIds() {
    var request = {
        bounds: map.getBounds(),
        type: 'bicycle_store',
    };

    var callback = function(data) {
        clearMap();

        // Remove places that are still visible from api results
        // to prevent duplicate markers from being placed
        mapMarkers.forEach(function(marker){
            for (var i = 0; i < data.length; i++) {
                if (marker.placeId == data[i].place_id) {
                    data.splice(i, 1);
                    break;
                }
            }
        });

        data.forEach(function(place){
            createMarker(place);
            viewModel.addGoogleListItem(place);
        });

        updateMarkersElevation();
    };

    placeService.nearbySearch(request, callback);
}

function googleError() {
    alert('Error: Google Maps could not be loaded. Please try again later.');
}






/**
 * Info Window operations
 */

function openInfoWindow(placeId) {
    if (infoWindow) {
        infoWindow.close();
    }
    for (var i = 0; i < mapMarkers.length; i++) {
        if (placeId == mapMarkers[i].placeId) {
            var marker = mapMarkers[i];

            var html = '<strong>' + marker.name + '</strong>';
            html += '<div>' + marker.address + '</div>';
            infoWindowContent = html;

            infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent,
            });
            infoWindow.open(map, marker);
            bounceMarker(marker);

            getGooglePlaceDetails(placeId);

            var markerPos = marker.getPosition();
            getFoursquarePlaceDetails(marker.name,
                                      marker.address,
                                      markerPos.lat(),
                                      markerPos.lng());
        }
    }
}

function updateInfoWindow(content) {

    if (content.source === 'google') {
        var html = '<div>';
        html += '<div>' + content.hours + '</div>';
        html += '<div>' + content.phone + '</div>';

        if (content.rating) {
            html += '<div>Google Rating: ' + content.rating + '/5</div>';
        }

        if (content.website) {
            html += '<div><a href="' + content.website + '" target="_blank">' +
                          'website</a></div>';
        }
        html += '</div>';
        infoWindowContent += html;
    }

    // Write new info to map
    infoWindow.setContent(infoWindowContent);
}

function getGooglePlaceDetails(placeId) {
    placeService.getDetails({
        placeId: placeId
    }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            var dateIndex = getDayOfWeekNum();
            var content = {
                source: 'google',
                status: 'OK',
                name: place.name,
                address: place.vicinity,
            };
            // For data that may not be present, check before storing
            content.rating = place.rating ? place.rating : null;
            content.phone = place.formatted_phone_number ?
                place.formatted_phone_number : null;
            content.hours = place.opening_hours ?
                place.opening_hours.weekday_text[dateIndex] : null;
            content.website = place.website ? place.website : null;

            updateInfoWindow(content);
        }
    });
}

function getFoursquarePlaceDetails(name, address, lat, lng) {

    var BASE_URL = 'https://api.foursquare.com/v2/venues/search';
    var CLIENT_ID = 'OYMZN0WOH3B4AWBD1F14DZAVGIK2PZX0EMPI0TDJEXY3QEXP';
    var CLIENT_SECRET = 'Z3KHAGWGUDNQLVVX4GJPJK0SYN5RRISVIJUAXA14ZQMV5DQS';

    var fullUrl = BASE_URL + '?' + $.param({
        v: 20161016,
        q: name,
        ll: lat + ',' + lng,
        radius: 5,
        address: address,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
    });

    console.log(fullUrl);

    var options = {
        success: successCallback,
    };

    function successCallback(data) {
        // Due to repeated difficulties getting Foursquare API's intent=match
        // parameter to function as documented, I use FuseJS to search through
        // results looking for a match. I use a very strict search threshold
        // (0.01) to ensure that results will only be displayed if a match is
        // almost certain.
        var venues = data.response.venues;
        var options = {
            shouldSort: true,
            tokenize: true,
            threshold: 0.1,
            location: 0,
            distance: 100,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            keys: [
                "name"
            ]
        };
        var fuse = new Fuse(venues, options);

        // Remove any special characters from shop name, as they will interfere
        // with FuseJS RegExp search functions
        // RegExp syntax sourced from this post: http://stackoverflow.com/a/4374890
        var safeName = name.replace(/[^\w\s]/gi, '');

        var result = fuse.search(safeName);
        console.log(result);
        var firstResult = result[0];
        // Check if FuseJS search returned any results
        if (firstResult) {
            // If result has any useful data, organize it in an object and
            // send result to be added to a map marker
            if (firstResult.stats.usersCount || firstResult.contact.twitter) {
                var resultData = {};
                if (firstResult.stats.usersCount) {
                    console.log(firstResult.stats.usersCount);
                    resultData.usersCount = firstResult.stats.usersCount;
                }
                if (firstResult.contact.twitter) {
                    console.log(firstResult.contact.twitter);
                    resultData.twitter = firstResult.contact.twitter;
                }
            }
        }
    }

    // Send request to Foursquare API
    $.ajax(fullUrl, options);
}






/**
 * Map marker operations
 */

// Places a map marker on the current google map
function createMarker(place) {
    var placeLat = place.geometry.location.lat();
    var placeLng = place.geometry.location.lng();

    var placeLatLng = new google.maps.LatLng(placeLat, placeLng);
    var marker = new google.maps.Marker({
        position: placeLatLng,
        title: place.name,
        icon: markerIcon('black')
    });

    // Populate marker with info from place query
    marker.placeId = place.place_id;
    marker.name = place.name;
    marker.address = place.vicinity;

    mapMarkers.push(marker);
    marker.addListener('click', function() {
        openInfoWindow(place.place_id);
    });
    marker.setMap(map);
}

// For each visible map marker, retrieves its elevation
// and updates marker color to correspond to relative elevation
function updateMarkersElevation() {

    // Get elevation data for all markers at once to minimize API queries
    var markerPositions = [];
    mapMarkers.forEach(function(marker){
        markerPositions.push(marker.getPosition());
    });

    elevationService.getElevationForLocations({
        'locations': markerPositions,
    }, function(results, status) {
        if (status === 'OK') {
            // Once elevation values have been returned for each marker,
            // both the results array and the marker array are looped to
            // verify equality and update the color of the marker
            var elevationRanges = getElevationRange(results);
            for (var i = 0; i < results.length; i++) {
                var elevLatLng = results[i].location.toUrlValue(5);
                var markerLatLng = mapMarkers[i].getPosition().toUrlValue(5);

                if (elevLatLng == markerLatLng) {
                    if (results[i].elevation < elevationRanges[1]) {
                        changeMapMarkerColor(mapMarkers[i], 'green');
                        mapMarkers[i].elevation = 'low';
                        viewModel.addGoogleElevation(mapMarkers[i].placeId,
                                                     'low');
                    } else if (results[i].elevation < elevationRanges[2]) {
                        changeMapMarkerColor(mapMarkers[i], 'yellow');
                        mapMarkers[i].elevation = 'med';
                        viewModel.addGoogleElevation(mapMarkers[i].placeId,
                                                     'med');

                    } else {
                        changeMapMarkerColor(mapMarkers[i], 'red');
                        mapMarkers[i].elevation = 'high';
                        viewModel.addGoogleElevation(mapMarkers[i].placeId,
                                                     'high');

                    }
                }

            }

            updateMapLegend(elevationRanges[0], elevationRanges[3]);
        }
    });
}

// Update map legend with current elevation min/max
function updateMapLegend(elevMin, elevMax) {
    var elevMid = Math.round((elevMax - elevMin) / 2 + elevMin);
    viewModel.setMapLegendRange(elevMax, elevMid, elevMin);
}

// Whenever place list is filtered, show markers that are included
// in the list, and hide markers that are not
function hideSpecifiedMarkers(placeIds) {
    // Hide marker if its placeId is specified, else show it
    mapMarkers.forEach(function(marker) {
        if (!placeIds.includes(marker.placeId)) {
            marker.setMap(null);
        } else {
            marker.setMap(map);
        }
    });
}

// Bounce a specific map marker once
function bounceMarker(marker) {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    window.setTimeout(function() {
        marker.setAnimation(null);
    }, 700);
}

// Change the stroke and fill color of a marker
function changeMapMarkerColor(marker, color){
    marker.setIcon(markerIcon(color, color));
}

function markerIcon(fillColor){
    return {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 4,
        strokeColor: 'black',
        strokeWeight: 1,
        fillColor: fillColor,
        fillOpacity: 0.5
    };
}

// Removes any list items and map markers which are
// outside current map bounds
function clearMap() {
    var mapBounds = map.getBounds();
    var clearListIds = [];

    // Hide and dereference markers outside of current map view
    mapMarkers.forEach(function(marker){
        if (!mapBounds.contains(marker.getPosition())) {
            clearListIds.push(marker.placeId);
            marker.setMap(null);
            var markerIndex;
            mapMarkers.splice(mapMarkers.indexOf(marker), 1);
        }
    });

    // Remove any hidden locations from list view
    viewModel.removeGoogleListItems(clearListIds);
}






/*
 * Helpers
 */

// Return a 4-part range of elevations [min, lowMax, medMax, highMax]
function getElevationRange(elevationObjs) {
    var elevations = [];
    elevationObjs.forEach(function(elevationObj) {
        elevations.push(Math.round(elevationObj.elevation));
    });
    var max = Math.max(...elevations);
    var min = Math.min(...elevations);
    var increment = Math.round((max - min) / 3);
    var lowElevMax = increment + min;
    var midElevMax = (increment * 2) + min;
    return [min, lowElevMax, midElevMax, max];
}

// Returns the number of the day of the week
// zero-indexed, starting on Monday
function getDayOfWeekNum() {
    var dateToday = new Date(Date.now());
    return parseInt(dateToday.getDay() - 1);
}
