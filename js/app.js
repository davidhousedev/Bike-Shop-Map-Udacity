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

    this.name = ko.observable(data.name || null);
    this.elevation = ko.observable(data.elevation || null);
    this.placeId = ko.observable(data.placeId || null);
    this.address = ko.observable(data.address || null);
    this.rating = ko.observable(data.rating || null);
    this.openNow = ko.observable(data.openNow || null);
};

var NewsItem = function(data) {
    this.title = ko.observable(data.title);
    this.snippet = ko.observable(data.snippet);
    this.url = ko.observable(data.url);
    this.published = ko.observable(data.published);
};


var ViewModel = function() {
    var self = this;
    // Observables for item lists
    self.markerData = ko.observableArray([]);
    self.newsItems = ko.observableArray([]);
    self.newsError = ko.observable();

    // Observables for search filters
    self.openNow = ko.observable(false);
    self.elevations = ko.observableArray(['unknown', 'low', 'med', 'high']);
    self.ratingMin = ko.observable(false);
    self.searchText = ko.observable('');

    self.filteredList = ko.computed(function() {
        var currentList = self.markerData();

        if (self.openNow()) {
            currentList = currentList.filter(function(item) {
                return item.openNow() === true;
            });
        }

        currentList = currentList.filter(function(item) {
            return self.elevations().includes(item.elevation());
        });

        if (self.ratingMin()) {
            currentList = currentList.filter(function(item){
                return item.rating() >= self.ratingMin();
            });
        }

        if (self.searchText()) {

            // Serialize list for searching
            var fuseSearchArry = []
            currentList.forEach(function(item){
                var obj = {
                    name: item.name(),
                    address: item.address(),
                    placeId: item.placeId()
                }
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

            var fuse = new Fuse(fuseSearchArry, searchOptions);
            var result = fuse.search(self.searchText());
            // hide map markers that are not present in list
            var fusePlaceIds = result.map(function(item){
                return item.placeId;
            });
            hideSpecifiedMarkers(fusePlaceIds);

            return result;
        }

        // hide map markers that are not present in list
        var placeIds = currentList.map(function(item){
            return item.placeId();
        });
        hideSpecifiedMarkers(placeIds);

        return currentList;
    }, this);

    self.openMapInfoWindow = function(listItem) {
        openInfoWindow(listItem.placeId());
    };

    self.addGoogleListItem = function(googlePlace) {
        console.log('value of openNow is: ' + self.openNow());
        //console.log(googlePlace);
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
            return placeIds.includes(listItem.placeId());
        });
    };

    // Updates knockoutJS list items with elevation rating from Google API call
    self.addGoogleElevation = function(placeId, elevationRating) {
        for (var i = 0; i < self.markerData().length; i++) {
            var place = self.markerData()[i];
            if (place.placeId() == placeId) {
                place.elevation(elevationRating);
                break;
            }
        }
    };

    self.populateNews = function() {
        var url = "https://api.nytimes.com/svc/search/v2/articlesearch.json";
        url += '?' + $.param({
            'api-key': "d553ebd4180c476d9b4a0faee6f69641",
          'q': "seattle bicycle bike"
        });
        $.ajax({
            url: url,
            method: 'GET',
        }).done(function(result) {
            console.log(result);
            result.response.docs.forEach(function(article){
                // Display all articles that aren't local to NYC
                if (article.section_name != 'N.Y. / Region'){
                    var pubDate = new Date(article.pub_date);
                    var data = {
                        title: article.headline.main,
                        snippet: article.snippet,
                        url: article.web_url,
                        published: pubDate.getFullYear()
                    };

                    self.newsItems.push(new NewsItem(data));
                }
            });
        }).fail(function(err) {
            self.newsError('Error: Could not retrieve articles from New York Times');
        });
    };

};


var viewModel = new ViewModel();
ko.applyBindings(viewModel);
viewModel.populateNews();

checkGoogleResourcesLoaded();






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
    map.addListener('idle', getPlaceIds);
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

function checkGoogleResourcesLoaded() {
    window.setTimeout(function() {
        if (typeof google == 'undefined') {
            alert('Error: Google Maps could not be loaded. ' +
                  'Please try again later.');
        }
    }, 1000);

    window.setTimeout(function() {
        if (!mapMarkers.toString()) {
            alert('Error: Location details could not be retrieved. ' +
                  'Please try again later.');
        } else {
            if (typeof mapMarkers[0].elevation == 'undefined') {
                alert('Error: Could not obtain elevation data');
            }
        }
    }, 3000);
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

            infoWindowContent = document.createElement('div');
            infoWindowContent.setAttribute('id', 'info-content');
            var $title = $(document.createElement('strong'));
            $title.text(mapMarkers[i].name);
            var $addr = $(document.createElement('div'));
            $addr.text(mapMarkers[i].address);
            infoWindowContent.appendChild($title[0]);
            infoWindowContent.appendChild($addr[0]);

            infoWindow = new google.maps.InfoWindow({
                content: infoWindowContent,
            });
            infoWindow.open(map, marker);
            bounceMarker(marker);

            getGooglePlaceDetails(placeId);
        }
    }
}

function updateInfoWindow(content) {
    console.log(content);

    if (content.source === 'google') {
        var $googleDiv = $(document.createElement('div'));
        var $hours = $(document.createElement('div'));
        $hours.text(content.hours);
        $googleDiv.append($hours);

        var $phone = $(document.createElement('div'));
        $phone.text(content.phone);
        $googleDiv.append($phone)

        if (content.rating) {
            var $rating = $(document.createElement('div'));
            $rating.text('Google Rating: ' + content.rating + '/5');
        }
        $googleDiv.append($rating);

        if (content.website) {
            var $websiteWrapper = $(document.createElement('div'));
            var $websiteLink = $(document.createElement('a'));
            $websiteLink.attr('href', content.website);
            $websiteLink.attr('target', '_blank');  // Open link in new tab
            $websiteLink.text('website');
            $websiteWrapper.append($websiteLink);
            $googleDiv.append($websiteWrapper);
        }

        // Write new info to map
        infoWindowContent.appendChild($googleDiv[0]);
    }

    infoWindow.setContent(infoWindowContent);
}

function getGooglePlaceDetails(placeId) {
    placeService.getDetails({
        placeId: placeId
    }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            console.log(place);
            var dateIndex = getDayOfWeekNum();
            var content = {
                source: 'google',
                status: 'OK',
                name: place.name,
                address: place.vicinity,
            };
            console.log('date index is: ' + dateIndex);
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






/**
 * Map marker operations
 */

function createMarker(place) {
    var placeLat = place.geometry.location.lat();
    var placeLng = place.geometry.location.lng();

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

    // Populate marker with info from place query
    marker.placeId = place.place_id;
    marker.name = place.name;
    marker.address = place.vicinity;

    mapMarkers.push(marker);
    marker.addListener('click', function() {
        openInfoWindow(place.place_id)
    });
    marker.setMap(map);
}

function updateMarkersElevation() {
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
            var $elevationLegend = $("#elevLegend");
            $elevationLegend.find('#elevMax').text(elevationRanges[3]);
            $elevationLegend.find('#elevMin').text(elevationRanges[0]);
            $elevationLegend.css('display', 'block');
        }
    });
}

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

function bounceMarker(marker) {
    marker.setAnimation(google.maps.Animation.BOUNCE);
    window.setTimeout(function() {
        marker.setAnimation(null);
    }, 700);
}

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
    var mapBounds = map.getBounds();
    var clearListIds = [];

    // Hide and dereference markers outside of current map view
    mapMarkers.forEach(function(marker){
        if (!mapBounds.contains(marker.getPosition())) {
            clearListIds.push(marker.placeId);
            marker.setMap(null);
            var markerIndex;
            mapMarkers.splice(mapMarkers.indexOf(marker), 1);
            //console.log(mapMarkers);
        }
    });

    // Remove any hidden locations from list view
    viewModel.removeGoogleListItems(clearListIds);
}






/*
 * Helpers
 */

function getElevationRange(elevationObjs) {
    var elevations = [];
    elevationObjs.forEach(function(elevationObj) {
        elevations.push(Math.round(elevationObj.elevation));
    });
    console.log(elevations);
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
