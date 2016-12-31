'use strict';

var map;
var placeService;

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
    console.log(map.getBounds());
    var request = {
        bounds: map.getBounds(),
        type: 'bicycle_store',
    };

    var callback = function(data) {
        console.log(data);
    };

    placeService.nearbySearch(request, callback);
}


$(function(){


    var ListMarker = function(data) {
        this.lat = ko.observable(data.lat || null);
        this.lon = ko.observable(data.lon || null);
        this.name = ko.observable(data.name || null);
        this.elevation = ko.observable(data.elevation || null);
        this.placeID = ko.observable(data.placeID || null);
        this.address = ko.observable(data.address || null);
    };

    var ViewModel = function(markers) {
        var self = this;
        self.markerData = ko.observableArray(markers.map(function (marker) {
            return new ListMarker(marker);
        }));

        console.log(self.markerData())
        /*// Creates a marker in the list and the map
        self.makeMarker = function(){

        };*/
    };

    var markers = [
        {
            name: 'Wheelie wheels',
            placeID: 'abc123'
        },
        {
            name: 'Bikie bike',
            placeID: 'abc456'
        },
        {
            name: 'Wompy womp',
            placeID: 'abc987'
        }
    ];


    var viewModel = new ViewModel(markers || []);
    ko.applyBindings(viewModel);

});