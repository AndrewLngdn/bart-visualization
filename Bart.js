var Bart = {
	routeXML: undefined,
	stationXML: undefined,
	routes:[],
	stationAbbreviations:[],

	init: function(){
		Bart.getRoutes();
		Bart.listStations();
		console.log(routes);

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
				html += r.name;
				html += "</li>";
			}
		});
		$('ul#routes').append(html);
		$(".route").click(function(e){
			$(e.target).data("routenumber");
		});
	}


}