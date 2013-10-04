var Bart = {
	routes:[],
	map: undefined,
	group: undefined,


	// init mapbox and begin bart API call-chain and data organization,
	// click handlers will be set here
	init: function(){
		Bart.getRoutes();
		Bart.map = L.mapbox.map('map', 'andrewlngdn.map-0crn2k4b').setView([37.76365837331252, -122.4151611328125], 10);
		Bart.map.markerLayer.on('click', function(e) {
			console.log(e.layer.getLatLng());
        	Bart.map.panTo(e.layer.getLatLng());
    	});

    	Bart.station = Backbone.Model.extend({
    		defaults: {
    			name: '',
    			abbr: '',
    			lat: 0,
    			lng: 0,
    			routeNumbers: []
    		}	
    	});

	},

	// get all the route data from Bart and pass it to organizing method
	getRoutes: function() {
		$.get("http://api.bart.gov/api/route.aspx?cmd=routeinfo&route=all&key=MW9S-E7SL-26DU-VV8V",
			function(data){
				var routes = [];
				$(data).find('route').each(function(i,d){
					routes.push(d);
				});
				Bart.organizeRouteData(routes);
			}
		);
	},

	// create route objects and extract station ordering for lineString objects
	organizeRouteData: function(routes){
		$.each(routes, function(i, d){
			var index = $(d).find('number').text();
			var stationsInOrder = $(d).find("station");
			var abbrs = $.map(stationsInOrder,function(n, i){
				return $(n).text();
			});
			Bart.routes[index] = ({
				name: $(d).find('name').text(),
				id: $(d).find('routeID').text(),
				number: $(d).find('number').text(),
				color: $(d).find('color').text(),
				stationsAbbr: abbrs,
				stations: []
			});
		});
		Bart.listStations();
	},

	// After getting the routs together, get a list of station abbreviations 
	// to be used to get station data from the API
	listStations: function(){
		var stationAbbreviations = [];
		$.get("http://api.bart.gov/api/stn.aspx?cmd=stns&key=MW9S-E7SL-26DU-VV8V", 
			function(data){
				$(data).find('station').each(function(i, s){
						var station = Bart.createStationObject();
						Bart.addStationToRoutes(station);
				})
				$(data).find('abbr').each(function(i, d){
					stationAbbreviations.push($(d).text());
				});
				Bart.getStation(stationAbbreviations);
			}
		)
	},

	// Get all the data for an individual station, create a station object, then 
	// add each station to its correct route by calling addsStationToRoutes.
	// This method also calls the appendRoutes function to fill out the sidebar
	// because we finally have all the information
	getStation: function(stationAbbreviations){
		var apiURL = "http://api.bart.gov/api/stn.aspx?cmd=stninfo&key=MW9S-E7SL-26DU-VV8V&orig=";
		$.each(stationAbbreviations, function(i, d){
			$.get(apiURL + d, function(stationData){
				var station = Bart.createStationObject(stationData);
				Bart.addStationToRoutes(station);
			});
		});
		Bart.appendRoutes();
	},

	// simplifies the bart data and creates a station object
	createStationObject: function(stationData){
		var stationRoutes = [];
		$(stationData).find('route').each(function(i, route){
			var routeNumber = parseInt($(route).text().split(" ").pop());
			stationRoutes.push(routeNumber);
		});
		return {
			name: $(stationData).find('name').text(),
			abbr: $(stationData).find('abbr').text(),
			lat: $(stationData).find('gtfs_latitude').text(),
			lng: $(stationData).find('gtfs_longitude').text(),
			routeNumbers: stationRoutes
		};
	},

	// Adds station objects to each route object
	addStationToRoutes: function(stationObj){
		$.each(stationObj.routeNumbers, function(i, route){
			var stationArray = Bart.routes[route].stations;
			var stationAbbrArray = Bart.routes[route].stationsAbbr;
			var index = $.inArray(stationObj.abbr, stationAbbrArray);
			stationArray[index] = stationObj;
		});
	},

	// appends all the html to the sidebar. Also sets up the click handler 
	// to append the markers
	appendRoutes: function() {
		var html = "";
		$.each(this.routes, function(i, r){
			if (r != undefined){
				html += "<li class='route', data-routenumber=" + r.number + ">";
				html += "<div class='route-title'>" + r.name + "</div>";
				html += "</li>";
			}
		});

		$('ul#routes').append(html);

		$(".route-title").click(function(e){

			$('.route').children("li").remove();
			$('.stations').remove();

			var route = $($(this).parent());

			var routeNumber = route.data("routenumber");
			
			var stationsHTML = "<ul class='stations'>";

			$.each(Bart.routes[routeNumber].stations, function(i, s){
				var lnglat = " data-lng=" + s.lng + " data-lat=" + s.lat + " ";
				stationsHTML += "<li class='station'" + lnglat + ">" + s.name + "</li>";
			});	
			stationsHTML += "</ul>"
			route.append(stationsHTML);
			Bart.appendMarkers(Bart.routes[routeNumber].stations);

			var lat;
			var lng; 
			var latlng;

			$('.station').click(function(e){
				lat = parseFloat($(this).data("lat"));
				lng = parseFloat($(this).data("lng"));
				latlng = new L.LatLng(lat, lng);

        		Bart.map.panTo(latlng);
        		$.each(Bart.map.markerLayer._layers, function(i, m){
					if (m._latlng != undefined){
						if (m._latlng.equals(latlng)){
							m.openPopup();
						}
					}
				})
    		});

		});
	},

	// appends the markers to the sidebar
	appendMarkers: function(stationArray){
		var features = [];
		var lineStringCoords = [];
		$.each(stationArray, function(i, s){
			if (s != undefined){
				var feature = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: [s.lng, s.lat]
					},
					properties: {
						"title": s.name,
						"marker-size": "small"
					}
				};
				features.push(feature);
				lineStringCoords.push([parseFloat(s.lng), parseFloat(s.lat)]);
			}
		});

		var lineString = {
			"type": "Feature",
			"geometry": {
				"type": "LineString",
				"coordinates": lineStringCoords
			}
		}

		features.push(lineString);
		Bart.map.markerLayer.setGeoJSON(features);
	}
}


