var front = {};
/*           85
 *     ---------------
 *     |             |
 *     |             |
 * -180|             |180
 *     |             |
 *     |             |
 *     ---------------
 *          -85
 *
 */

(function (context) {
    "use strict";

    // https://forum-en.guildwars2.com/forum/community/api/Event-Details-API-location-coordinates/first#post2318071
    function fromPointToLatLng(point, max_zoom) {
        var size = (1 << max_zoom) * 256,
            lat = (2 * Math.atan(Math.exp((point.y - size/2) / -(size/(2 * Math.PI)))) - (Math.PI / 2)) * (180/Math.PI),
            lng = (point.x - size/2) * (360/size);
        return new google.maps.LatLng(lat, lng);
    }

    var map, southwest, northeast, northwest, southeast;

    southwest = fromPointToLatLng(new google.maps.Point(0, 32768), 7);
    northeast = fromPointToLatLng(new google.maps.Point(32768, 0), 7);
    var mapBound = new google.maps.LatLngBounds(southwest, northeast);

    var Snowden_Drifts = [[17664, 11264],[21760, 13312]]
    var Snowden_Drifts_Northwest = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[0][0], Snowden_Drifts[0][1]), 7);//ok
    var Snowden_Drifts_Northeast = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[1][0], Snowden_Drifts[0][1]), 7);//ok
    var Snowden_Drifts_Southwest = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[0][0], Snowden_Drifts[1][1]), 7);//ok
    var Snowden_Drifts_Southeast = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[1][0], Snowden_Drifts[1][1]), 7);

    // southeast = fromPointToLatLng(new google.maps.Point(32768, 32768), 7); //northeast[0], southwest[1]
    // northwest = fromPointToLatLng(new google.maps.Point(0, 0), 7); //northeast[1], southwest[0]

    var border = [
        new google.maps.LatLng(-40, -90), //y, x
        new google.maps.LatLng(-40, 90),
        new google.maps.LatLng(40, 90),
        new google.maps.LatLng(40, -90),
        new google.maps.LatLng(-40, -90) //y, x
    ]

    var bermudaTriangle = new google.maps.Polygon({
        paths: border,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35
      });

    var Snowden_Drifts_Bounds = [
        Snowden_Drifts_Northeast,
        Snowden_Drifts_Northwest,
        Snowden_Drifts_Southwest,
        Snowden_Drifts_Southeast,
        Snowden_Drifts_Northeast
    ]

    var Snowden_Drifts_line = new google.maps.Polyline({
        path: Snowden_Drifts_Bounds,
        strokeColor: '#FFCC00',
        strokeOpacity: 0.8,
        strokeWeight: 2
      });

    // https://developers.google.com/maps/documentation/javascript/maptypes#OverlayMapTypes
    var CoordMapType = function(tileSize) {
        this.tileSize = tileSize;
    };

    CoordMapType.prototype = {
        getTile : function(coord, zoom, ownerDocument) {
            var div = ownerDocument.createElement('div');
            div.innerHTML = coord;
            div.style.width = this.tileSize.width + 'px';
            div.style.height = this.tileSize.height + 'px';
            div.style.fontSize = '10';
            div.style.borderStyle = 'solid';
            div.style.borderWidth = '1px';
            div.style.borderColor = '#AAAAAA';
            return div;
        }
    };

    var Gw2MapOptions = {
        tileSize: new google.maps.Size(256, 256),
        maxZoom: 7,
        minZoom: 0,
        name: "GW2WorldMap",
        getTileUrl: function(coord, zoom) {
            var normalizedCoord = ui.getNormalizedCoord(coord, zoom);
            if (!normalizedCoord) {
                return null;
            }
            // https://tiles.guildwars2.com/1/1/zoom/{x}/{y}.jpg
            return "https://tiles.guildwars2.com/1/1/"+zoom+"/"+normalizedCoord.x+"/"+normalizedCoord.y+".jpg";
            // return url;
        }
    };

    nameOverlay.prototype = new google.maps.OverlayView();

    // https://developers.google.com/maps/documentation/javascript/examples/overlay-simple
    function nameOverlay (bounds, text, map) {
        // Initialize all properties.
        this.bounds_ = bounds;
        this.text_ = text;
        this.map_ = map;

        // Define a property to hold the image's div. We'll
        // actually create this div upon receipt of the onAdd()
        // method so we'll leave it null for now.
        this.div_ = null;

        // Explicitly call setMap on this overlay.
        this.setMap(map);
    };

    nameOverlay.prototype.onAdd = function() {
        var div = document.createElement('div');
        div.style.borderStyle = 'none';
        div.style.borderWidth = '0px';
        div.style.position = 'absolute';

        //creation d'un paragraphe
        var txt = document.createTextNode(this.text_);
        var paragraph = document.createElement('p');
        paragraph.appendChild(txt);
        div.appendChild(paragraph)

        this.div_ = div;

        // Add the element to the "overlayLayer" pane.
        var panes = this.getPanes();
        panes.overlayLayer.appendChild(div);
    };

    nameOverlay.prototype.draw = function() {

        // We use the south-west and north-east
        // coordinates of the overlay to peg it to the correct position and size.
        // To do this, we need to retrieve the projection from the overlay.
        var overlayProjection = this.getProjection();

        // Retrieve the south-west and north-east coordinates of this overlay
        // in LatLngs and convert them to pixel coordinates.
        // We'll use these coordinates to resize the div.
        var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
        var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

        // Resize the image's div to fit the indicated dimensions.
        var div = this.div_;
        div.style.left = sw.x + 'px';
        div.style.top = ne.y + 'px';
        div.style.width = (ne.x - sw.x) + 'px';
        div.style.height = (sw.y - ne.y) + 'px';

    };

    nameOverlay.prototype.onRemove = function() {
        this.div_.parentNode.removeChild(this.div_);
        this.div_ = null;
    };

    var overlay;

    var ui = {
        initialize: function () {

            var GW2WorldMap = new google.maps.ImageMapType(Gw2MapOptions),
                myOptions = {
                    center : new google.maps.LatLng(0, 0),
                    zoom : 0,
                    mapTypeId : "custom",
                    mapTypeControl : false,
                    panControl: false,
                    streetViewControl: false,
                    backgroundColor : '#fff'
                };


            map = new google.maps.Map(document.getElementById("GW2map"), myOptions);


            map.mapTypes.set('custom', GW2WorldMap);

            google.maps.event.addListener(map, 'zoom_changed', function(ev) {
                var tileRange = Math.pow(2, map.zoom);
                for (var i = 0; i<tileRange; i++) {
                    overlay = new nameOverlay(mapBound, 'text'+i, map);
                }
                console.log(map.zoom);
            });

            // map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));
            var p = new google.maps.Point(12839.8, 12483.8)
            var myLatLng = fromPointToLatLng(p, 7);
            // var marker = ui.addMarker(myLatLng);
            // ui.addMarker(Snowden_Drifts_Southwest);
            // ui.addMarker(Snowden_Drifts_Southeast);
            // ui.addMarker(Snowden_Drifts_Northwest);
            // ui.addMarker(new google.maps.LatLng(-85, 180));
            bermudaTriangle.setMap(map);
            Snowden_Drifts_line.setMap(map);

        },
        addMarker : function (location) {
            var marker = new google.maps.Marker({
                position: location,
                map: map
            });
            return marker;
        },
        getNormalizedCoord: function (coord, zoom) {
            var y = coord.y;
            var x = coord.x;

            // https://developers.google.com/maps/documentation/javascript/maptypes#ImageMapTypes
            // tile range in one direction range is dependent on zoom level
            // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
            // var tileRange = 1 << zoom;
            //Donne le nombre de tuiles qui sera chargée sur une rangée ou une colonne
            //zoom 0 -> 1 tuile, zoom 1 -> 2 tuiles, zoom 2 -> 4 tuiles etc
            var tileRange = Math.pow(2, zoom);
            // On ne charge pas d'images pour toutes les coordonées x et y inférieures à 0
            // et supérieures au nombre de tuiles par rangée

            if ((x < tileRange) &&
                (x > -1) &&
                (y < tileRange) &&
                (y > -1) ) {
                return {
                    x: x,
                    y: y
                };
            }

            return null;
        }
    };

    context.ui = ui;

})(front)

$(document).ready(front.ui.initialize);
//$(window).load(function() { front.ui.init() });
