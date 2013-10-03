var Bart = {
	routeXML: undefined,
	stationXML: undefined,
	routes:[],
	stationAbbreviations:[],
	map: undefined,
	group: undefined,

	init: function(){
		Bart.getRoutes();
		Bart.map = L.mapbox.map('map', 'andrewlngdn.map-0crn2k4b').setView([37.76365837331252, -122.4151611328125], 11);
		console.log(routes);
		// Bart.group = L.geoJson().addTo(Bart.map);
		Bart.map.markerLayer.on('click', function(e) {
        	Bart.map.panTo(e.layer.getLatLng());
    	});
	},

	getRoutes: function() {
		$.get("http://api.bart.gov/api/route.aspx?cmd=routeinfo&route=all&key=MW9S-E7SL-26DU-VV8V",
			function(data){
				console.log(data);
				Bart.routeXML = data;
				var routes = [];
				$(Bart.routeXML).find('route').each(function(i,d){
					routes.push(d);
				});
				Bart.organizeRouteData(routes);
			}
		);
	},

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


	listStations: function(){
		var stationAbbreviations = [];
		$.get("http://api.bart.gov/api/stn.aspx?cmd=stns&key=MW9S-E7SL-26DU-VV8V", 
			function(data){
				$(data).find('abbr').each(function(i, d){
					stationAbbreviations.push($(d).text());
				});
				Bart.sortStations(stationAbbreviations);
			}
		)
	},

	sortStations: function(stationAbbreviations){
		var apiURL = "http://api.bart.gov/api/stn.aspx?cmd=stninfo&key=MW9S-E7SL-26DU-VV8V&orig=";
		$.each(stationAbbreviations, function(i, d){
			$.get(apiURL + d, function(stationData){
				var station = Bart.createStationObject(stationData);
				Bart.addStationToRoutes(station);
			});
		});
		Bart.appendRoutes();
	},
	
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



	addStationToRoutes: function(stationObj){
		$.each(stationObj.routeNumbers, function(i, route){
			var stationArray = Bart.routes[route].stations;
			var stationAbbrArray = Bart.routes[route].stationsAbbr;
			var index = $.inArray(stationObj.abbr, stationAbbrArray);
			stationArray[index] = stationObj;
			// stationArray.push(stationObj);
		});

	},

	appendRoutes: function() {
		var html = "";
		var c = 0;
		$.each(this.routes, function(i, r){
			if (r != undefined){
				html += "<li class='route', data-routenumber=" + r.number + ">";
				html += "<div class='route-title'>" + r.name + "</div>";
				html += "</li>";
			}
			console.log(c++)
		});

		$('ul#routes').append(html);

		$(".route-title").click(function(e){
			$('.route').children("li").remove();

			var route = $($(this).parent());

			var routeNumber = route.data("routenumber");
			$.each(Bart.routes[routeNumber].stations, function(i, s){
				route.append("<li class='station'>" + s.name + "</li>");
			});	
			Bart.appendMarkers(Bart.routes[routeNumber].stations);
		});
	},

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
		// console.log(c);
		features.push(lineString);
		Bart.map.markerLayer.setGeoJSON(features);
	}
}


