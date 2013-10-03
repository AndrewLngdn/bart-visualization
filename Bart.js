var Bart = {
	routeXML: undefined,
	stationXML: undefined,
	routes:[],
	stationAbbreviations:[],
	map: undefined,
	group: undefined,

	init: function(){
		Bart.getRoutes();
		Bart.listStations();
		Bart.map = L.mapbox.map('map', 'andrewlngdn.map-0crn2k4b').setView([37.76365837331252, -122.4151611328125], 11);
		console.log(routes);
		// Bart.group = L.geoJson().addTo(Bart.map);
		Bart.map.markerLayer.on('click', function(e) {
        	Bart.map.panTo(e.layer.getLatLng());
    	});
	},

	getRoutes: function() {
		$.get("http://api.bart.gov/api/route.aspx?cmd=routes&key=MW9S-E7SL-26DU-VV8V",
			function(data){
				Bart.routeXML = data;
				var routes = [];
				$(Bart.routeXML).find('route').each(function(i,d){
					routes.push(d);
				});

				Bart.organizeRouteData(routes);
				Bart.appendRoutes();
			}
		);
	},

	organizeRouteData: function(routes){
		$.each(routes, function(i, d){
			var index = $(d).find('number').text();

			Bart.routes[index] = ({
				name: $(d).find('name').text(),
				id: $(d).find('routeID').text(),
				number: $(d).find('number').text(),
				color: $(d).find('color').text(),
				stations: []
			});
		});
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

	sortStations: function(stationAbbreviations){
		var apiURL = "http://api.bart.gov/api/stn.aspx?cmd=stninfo&key=MW9S-E7SL-26DU-VV8V&orig=";
		$.each(stationAbbreviations, function(i, d){
			$.get(apiURL + d, function(stationData){
				var station = Bart.createStationObject(stationData);
				Bart.addStationToRoutes(station);
			});
		});
	},

	addStationToRoutes: function(stationObj){
		$.each(stationObj.routeNumbers, function(i, route){
			var stationArray = Bart.routes[route].stations;
			stationArray.push(stationObj);
		});
	},

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
			}
		});
		Bart.map.markerLayer.setGeoJSON(features);
	}
}


