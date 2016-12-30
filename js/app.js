
var map;

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: -33.867, lng: 151.206},
        zoom: 10,
        stylers: [{
            stylers: [{visibility: 'simplified'}]
        }, {
            elementType: 'labels',
            stylers: [{visibility: 'off'}]
        }]
    });
}


$(function(){
    'use strict';

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