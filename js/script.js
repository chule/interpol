var width = 960,
	height = 650;
	
var projection = d3.geo.satellite()
	.translate([width/2,0])
	.distance(5)
	.scale(1500)
	.center([0, 0])
	.rotate([-8, -61, -15])
	.tilt(10)
	.clipAngle(Math.acos(1 / 1.2) * 180 / Math.PI - 1e-6);
	
var path = d3.geo.path()
	.projection(projection);
	
var graticule = d3.geo.graticule()
    .step([5, 5]);
	
var svg = d3.select(".svg").append("svg")
	.attr("width", width)
	.attr("height", height);

svg.append("rect")
	.attr({
		width: width,
		height: height,
		fill: "lightblue"
	})
	
svg.append("path")
	.datum(graticule)
	.attr("class", "graticule")
	.attr("d", path);
	
// var land = svg.append("g");


var tooltip = {
    element: null,
    init: function() {
        this.element = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);
    },
    show: function(t) {
        this.element.html(t).transition().duration(200).style("left", d3.event.pageX + 20 + "px").style("top", d3.event.pageY - 20 + "px").style("opacity", .9);
    },
    move: function() {
        this.element.transition().duration(30).ease("linear").style("left", d3.event.pageX + 20 + "px").style("top", d3.event.pageY - 20 + "px").style("opacity", .9);
    },
    hide: function() {
        this.element.transition().duration(500).style("opacity", 0)
    }};

tooltip.init();

var numFormat = d3.format(",d");

//http://www.interpol.int/gmap/points
 queue()
      .defer(d3.json, "europe.topo.json")
      .defer(d3.json, "data.json")
      //.defer(d3.json, "http://www.interpol.int/gmap/points")      
      .await(ready);


function ready(error, data, data1) {

	// land.append("path")
	// 	.datum(topojson.object(data, data.objects.collection))
	// 	.attr("class", "land")
	// 	.attr("d", path);

	var rateById = {};

	var europeData = data1[0].children;



	

    europeData.forEach(function(d) { 
    	if (d.children[0].name === "Wanted Persons") {
	    	rateById[d.name] = d.children[0]["data"]["count"]; 
    	} else 
    	if (d.children[1]) {
	    	var wanted = d.children[1]["data"]["count"];	    	
	    	rateById[d.name] = wanted; 

    	}
    	
    });

	var min = rateById["Albania"], max = rateById["Albania"];

    for (i in rateById) {
    	if (+rateById[i] <= min) {
    		min = +rateById[i];
    	}
    }

    for (j in rateById) {
    	if (+rateById[j] > max) {
    		max = +rateById[j];
    	}
    }



	  var colorScale = d3.scale.threshold()
	    .domain([5, 15, 30, 50, 100, 150, 300]) 
	    .range(['rgb(255,255,204)','rgb(255,237,160)','rgb(254,217,118)','rgb(254,178,76)','rgb(253,141,60)','rgb(252,78,42)','rgb(227,26,28)','rgb(177,0,38)']); 

    // var colorScale = d3.scale.linear()
    //   .domain([min, max]) 
    //   .range(["steelblue", "darkred"]); 


    console.log(min,max)

	var subunits = topojson.feature(data, data.objects.collection);	
	var map = svg.append("g")
	                .attr("class", "map");



	var countries = map.selectAll(".subunit")
	  .data(topojson.feature(data, data.objects.collection).features)
	  .enter().append("path")
	  .attr("class", function(d) { return "subunit " + d.properties.subunit; })
	  .attr("d", path)
	  .style("fill", function (d) {
	  	if (rateById[d.properties.name]) {
	  		return colorScale(rateById[d.properties.name])
		} else {
			return "lightgrey";
		}

		}); 	
	
	map.append("path")
	  .datum(topojson.mesh(data, data.objects.collection, function(a, b) { return a !== b; }))
	  .attr("d", path)
	  .attr("class", "subunit-boundary");



	  countries.on("mouseover", function (d, i) {
	      //console.log(this)
	      var wanted, rate;
	      if (!rateById[d.properties.name]) {
	      	wanted = "No data.";
	      	rate = "No data.";
	      } else {
	      	wanted = rateById[d.properties.name];
	      	rate = d3.round(rateById[d.properties.name] / (+d.properties.pop_est) * 100000, 2);	      	
	      }

	      tooltip.show("<b>" + d.properties.subunit  + "</b>" 
	      	+ "<br>" + "Population: " + numFormat(d.properties.pop_est)
	      	+ "<br>" + "Wanted by Interpol: " + wanted
	      	+ "<br>" + "Wanted per 100,000: " + rate
	      	);    
	      //toGreyExcept(this);
	  });


	  countries.on("mousemove", function (d, i) {   
	      tooltip.move();
	      })
	      .on("mouseout", function (d, i) {
	      //createStuff();
	      tooltip.hide();
	  }); 



	  formatValue = d3.format("s");

	  // A position encoding for the key only.
	  var x = d3.scale.linear()
	      .domain([0, 350])
	      .range([0, 300]);



	  var xAxis = d3.svg.axis()
	      .scale(x)
	      .orient("bottom")
	      .tickSize(13)
	      .tickValues(colorScale.domain())
	      .tickFormat(function(d) { return formatValue(d)});  
	           
	  // key
	  var g = svg.append("g")
	      .attr("class", "key")
	      .attr("transform", "translate(60,600)");

	  g.selectAll("rect")
	      .data(colorScale.range().map(function(d, i) {
	        return {
	          x0: i ? x(colorScale.domain()[i - 1]) : x.range()[0],
	          x1: i < colorScale.domain().length ? x(colorScale.domain()[i]) : x.range()[1],
	          z: d
	        };
	      }))
	    .enter().append("rect")
	      .attr("height", 9)
	      .attr("x", function(d) { return d.x0; })
	      .attr("width", function(d) { return d.x1 - d.x0; })
	      .style("fill", function(d) { return d.z; });

	  g.call(xAxis).append("text")
	      .attr("class", "caption")
	      .attr("y", -6)
	      .text("LEGEND (wanted by country)");  
	  // key end    	      

};
	