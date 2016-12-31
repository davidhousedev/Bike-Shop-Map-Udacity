'use strict';

var map;
var placeService;
var elevationService;
var infoWindow;
var mapMarkers = [];


/**
 * KnockoutJS dynamic list handling
 */

var ListMarker = function(data) {
    /*this.lat = ko.observable(data.lat || null);
    this.lon = ko.observable(data.lon || null);*/
    this.name = ko.observable(data.name || null);
    this.elevation = ko.observable(data.elevation || null);
    this.placeID = ko.observable(data.placeID || null);
    this.address = ko.observable(data.address || null);
    this.rating = ko.observable(data.rating || null);
    this.openNow = ko.observable(data.openNow || null);
};

var ViewModel = function() {
    var self = this;
    self.markerData = ko.observableArray([]);

    self.clearList = function() {
        self.markerData.removeAll();
    };

    self.addGoogleListItem = function(googlePlace) {
        console.log(googlePlace);
        var itemData = {
            name: googlePlace.name,
            placeID: googlePlace.place_id,
            rating: googlePlace.rating,
            address: googlePlace.vicinity,
        };

        if (googlePlace.opening_hours) {
            itemData.openNow = googlePlace.opening_hours.open_now;
        }

        self.markerData.push(new ListMarker(itemData));
    };

    // Updates knockoutJS list items with elevation rating from Google API call
    self.addGoogleElevation = function(placeID, elevationRating) {
        for (var i = 0; i < self.markerData().length; i++) {
            var place = self.markerData()[i];
            if (place.placeID() == placeID) {
                place.elevation(elevationRating);
                break;
            }
        }
    };
};


var viewModel = new ViewModel();
ko.applyBindings(viewModel);


/**
 * Google Map API and Marker handling
 */

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
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
    var elevLegend = document.getElementById('elevLegend');
    map.controls[google.maps.ControlPosition.LEFT_TOP].push(elevLegend)

    // Search for bike shops once map idle
    map.addListener('idle', getPlaceIDs);
}

function getPlaceIDs() {
    var request = {
        bounds: map.getBounds(),
        type: 'bicycle_store',
    };

    var callback = function(data) {
        viewModel.clearList();
        clearMap();
        data.forEach(function(place){
            createMarker(place);
            viewModel.addGoogleListItem(place);
        });

        updateMarkersElevation();
    };

    placeService.nearbySearch(request, callback);
}

function createMarker(place) {
    var placeLat = place.geometry.location.lat();
    var placeLng = place.geometry.location.lng();

    // Image sourced from Wikipedia
    var image = {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 4,
        strokeColor: 'black'
    };

    var placeLatLng = new google.maps.LatLng(placeLat, placeLng);
    var marker = new google.maps.Marker({
        position: placeLatLng,
        title: place.name,
        icon: markerIcon('black', 'black')
    });
    marker.placeID = place.place_id;
    mapMarkers.push(marker);
    marker.addListener('click', function() {
        openInfoWindow(place.place_id)
    });
    marker.setMap(map);
}

function updateMarkersElevation() {
    var markerPositions = [];
    mapMarkers.forEach(function(marker){
        markerPositions.push(marker.getPosition())
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
                console.log('elev map marker:')
                console.log(mapMarkers[i]);
                if (elevLatLng == markerLatLng) {
                    if (results[i].elevation < elevationRanges[1]) {
                        changeMapMarkerColor(mapMarkers[i], 'green');
                        mapMarkers[i].elevation = 'low';
                        viewModel.addGoogleElevation(mapMarkers[i].placeID,
                                                     'low');
                    } else if (results[i].elevation < elevationRanges[2]) {
                        changeMapMarkerColor(mapMarkers[i], 'yellow');
                        mapMarkers[i].elevation = 'med';
                        viewModel.addGoogleElevation(mapMarkers[i].placeID,
                                                     'med');
                    } else {
                        changeMapMarkerColor(mapMarkers[i], 'red');
                        mapMarkers[i].elevation = 'high';
                        viewModel.addGoogleElevation(mapMarkers[i].placeID,
                                                     'high');
                    }
                }

            }
            var $elevationLegend = $("#elevLegend");
            $elevationLegend.find('#elevMax').text(elevationRanges[3]);
            $elevationLegend.find('#elevMin').text(elevationRanges[0]);
            $elevationLegend.css('display', 'block');
        }
    });
}

/**
 * Info Window operations
 */

 function openInfoWindow(placeID) {
    if (infoWindow) {
        infoWindow.close();
    }
    for (var i = 0; i < mapMarkers.length; i++) {
        if (placeID == mapMarkers[i].placeID) {
            var marker = mapMarkers[i];
            infoWindow = new google.maps.InfoWindow({
                content: 'hello, world',
            });
            infoWindow.open(map, marker)
        }
    }
 }



/**
 * Map marker operations
 */

function changeMapMarkerColor(marker, color){
    marker.setIcon(markerIcon(color, color));
}

function markerIcon(strokeColor, fillColor){
    return {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        scale: 4,
        strokeColor: strokeColor,
        strokeWeight: 1,
        fillColor: fillColor,
        fillOpacity: 0.5
    };
}

function clearMap() {
    // Hide and dereference any current map markers
    var mapBounds = map.getBounds();
    mapMarkers.forEach(function(marker){
        if (!mapBounds.contains(marker.getPosition())) {
            marker.setMap(null);
            var markerIndex
            mapMarkers.splice(mapMarkers.indexOf(marker), 1);
            console.log(mapMarkers);
        }
    });
    //mapMarkers = [];
}

/*
 * Math helper
 */

function getElevationRange(elevationObjs) {
    var elevations = [];
    elevationObjs.forEach(function(elevationObj) {
        elevations.push(Math.round(elevationObj.elevation));
    });

    var max = Math.max(...elevations);
    var min = Math.min(...elevations);
    var lowElevMax = Math.round((max - min) / 3);
    var midElevMax = Math.round(lowElevMax * 2);
    return [min, lowElevMax, midElevMax, max];
}

