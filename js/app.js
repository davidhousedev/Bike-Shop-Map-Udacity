'use strict';

var map;
var placeService;
var elevationService;
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
};

var ViewModel = function() {
    var self = this;
    self.markerData = ko.observableArray([]);

    self.clearList = function() {
        self.markerData.removeAll();
    };

/*    self.addListItem = function(googlePlace) {
        itemData = {
            name: googlePlace.name,

        }
    };*/
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
        clearMapMarkers();
        data.forEach(function(place){
            createMarker(place);
            viewModel.markerData.push(place.place_id);
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
    mapMarkers.push(marker);
    console.log(marker);
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
                console.log(markerLatLng, elevLatLng)
                if (elevLatLng == markerLatLng) {
                    if (results[i].elevation < elevationRanges[1]) {
                        changeMapMarkerColor(mapMarkers[i], 'green')
                    } else if (results[i].elevation < elevationRanges[2]) {
                        changeMapMarkerColor(mapMarkers[i], 'yellow')
                    } else {
                        changeMapMarkerColor(mapMarkers[i], 'red')
                    }
                }
            }
        }
    })
}



function changeMapMarkerColor(marker, color){
    marker.setIcon(markerIcon(color, color))
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

function clearMapMarkers() {
    mapMarkers.forEach(function(marker){
        marker.setMap(null)
    });
    mapMarkers = [];
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

