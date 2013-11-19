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


// https://forum-en.guildwars2.com/forum/community/api/Event-Details-API-location-coordinates/first#post2318071
function fromPointToLatLng(point, max_zoom) {
    var size = (1 << max_zoom) * 256,
        lat = (2 * Math.atan(Math.exp((point.y - size/2) / -(size/(2 * Math.PI)))) - (Math.PI / 2)) * (180/Math.PI),
        lng = (point.x - size/2) * (360/size);
    return new google.maps.LatLng(lat, lng);
}

(function (context) {
    "use strict";

    var map_url_infos = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=2";
    var map_infos = $.getJSON(map_url_infos);
    var datas_regions = [];
    var map_list = [];
    var explorable_zone_id = [];

    var explorable_zone = $.getJSON("https://api.guildwars2.com/v1/map_names.json");

    var map, southwest, northeast, northwest, southeast;

    southwest = fromPointToLatLng(new google.maps.Point(0, 32768), 7);
    northeast = fromPointToLatLng(new google.maps.Point(32768, 0), 7);
    var map_bounds = new google.maps.LatLngBounds(southwest, northeast);
    var allowedBounds = map_bounds;

    // var Snowden_Drifts = [[17664, 11264],[21760, 13312]]
    // var Snowden_Drifts_Northwest = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[0][0], Snowden_Drifts[0][1]), 7);
    // var Snowden_Drifts_Northeast = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[1][0], Snowden_Drifts[0][1]), 7);
    // var Snowden_Drifts_Southwest = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[0][0], Snowden_Drifts[1][1]), 7);
    // var Snowden_Drifts_Southeast = fromPointToLatLng(new google.maps.Point(Snowden_Drifts[1][0], Snowden_Drifts[1][1]), 7);

    // var Snowden_Drifts_Bounds = [
    //     Snowden_Drifts_Northeast,
    //     Snowden_Drifts_Northwest,
    //     Snowden_Drifts_Southwest,
    //     Snowden_Drifts_Southeast,
    //     Snowden_Drifts_Northeast
    // ]

    // var Snowden_Drifts_line = new google.maps.Polyline({
    //     path: Snowden_Drifts_Bounds,
    //     strokeColor: '#FFCC00',
    //     strokeOpacity: 0.8,
    //     strokeWeight: 2
    //   });

    function draw_map(map_datas, map) {
        var l = map_datas.length;
        for(var i = 0; i < l; i++) {
            var map_rect = map_datas[i][1];
            var map_rect_northwest = fromPointToLatLng(new google.maps.Point(map_rect[0][0], map_rect[0][1]), 7);
            var map_rect_northeast = fromPointToLatLng(new google.maps.Point(map_rect[1][0], map_rect[0][1]), 7);
            var map_rect_southwest = fromPointToLatLng(new google.maps.Point(map_rect[0][0], map_rect[1][1]), 7);
            var map_rect_southeast = fromPointToLatLng(new google.maps.Point(map_rect[1][0], map_rect[1][1]), 7);

            var map_rect_bounds = [
                map_rect_northeast,
                map_rect_northwest,
                map_rect_southwest,
                map_rect_southeast,
                map_rect_northeast
            ]

            var map_rect_polygon = new google.maps.Polygon({
                paths: map_rect_bounds,
                strokeColor: '#FFCC00',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#FF0000',
                fillOpacity: 0.35
              });

            map_rect_polygon.setMap(map);

        }

    }

    // https://developers.google.com/maps/documentation/javascript/maptypes#OverlayMapTypes
    var CoordMapType = function(tile_size) {
        this.tile_size = tile_size;
    };

    CoordMapType.prototype = {
        getTile : function(coord, zoom, ownerDocument) {
            var div = ownerDocument.createElement('div');
            div.innerHTML = coord;
            div.style.width = this.tile_size.width + 'px';
            div.style.height = this.tile_size.height + 'px';
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
        minZoom: 2,
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
                    zoom : 2,
                    mapTypeId : "custom",
                    mapTypeControl : false,
                    panControl: false,
                    streetViewControl: false,
                    backgroundColor : '#fff'
                };


            map = new google.maps.Map(document.getElementById("GW2map"), myOptions);


            map.mapTypes.set('custom', GW2WorldMap);


            // google.maps.event.addListener(map, 'zoom_changed', draw_regions)

            google.maps.event.addListener(map, 'zoom_changed', function(ev) {
                mapNamesManager.update_display();
            });

            // map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));
            var p = new google.maps.Point(12839.8, 12483.8)
            var myLatLng = fromPointToLatLng(p, 7);
            // var marker = ui.addMarker(myLatLng);
            // ui.addMarker(Snowden_Drifts_Southwest);
            // ui.addMarker(Snowden_Drifts_Southeast);
            // ui.addMarker(Snowden_Drifts_Northwest);
            // ui.addMarker(new google.maps.LatLng(-85, 180));

            var mapNamesManager = new MapNames(map, Gw2MapOptions.maxZoom);

            $.when(map_infos, explorable_zone).done( function(data1, data2) {
                for (var i in data2[0]) {
                    explorable_zone_id.push(data2[0][i]["id"]);
                };

                var regions = data1[0].regions;

                for (var r in regions ) {
                    // overlay = new nameOverlay(map_bounds, data1.regions[region].name, map);
                    datas_regions.push([regions[r]['name'], regions[r]['label_coord']]);
                    for(var mapId in regions[r]['maps']) {
                        //City are not present in map_names.json but we could find them in map_floor.json
                        //because min_lvl is 0 and max_lvl 80
                        var min_lvl = regions[r]['maps'][mapId]['min_level'];
                        var max_lvl = regions[r]['maps'][mapId]['max_level'];
                        if(explorable_zone_id.indexOf(mapId) != -1 || (min_lvl == 0 && max_lvl == 80)) {
                            map_list.push([regions[r]['maps'][mapId]['name'], regions[r]['maps'][mapId]['continent_rect']])
                        }
                    }
                }
                mapNamesManager.display_names(datas_regions);
                draw_map(map_list, map);
            })

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
