'use strict';

var map;
var placeService;
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
    };

    placeService.nearbySearch(request, callback);
}

function createMarker(place) {
    var placeLat = place.geometry.location.lat();
    var placeLng = place.geometry.location.lng();

    // Image sourced from Wikipedia
    var image = {
        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
        //scaledSize: new google.maps.Size(48, 28),
        scale: 4,
        strokeColor: 'black'
    }

    var placeLatLng = new google.maps.LatLng(placeLat, placeLng);
    var marker = new google.maps.Marker({
        position: placeLatLng,
        title: place.name,
        icon: image
    });
    mapMarkers.push(marker);
    console.log(marker);
    marker.setMap(map);
}

function clearMapMarkers() {
    mapMarkers.forEach(function(marker){
        marker.setMap(null)
    });
    mapMarkers = [];
}