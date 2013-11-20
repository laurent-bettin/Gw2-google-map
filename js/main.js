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

    var mapFloorUrl = "https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=2";
    var mapNamesRequest = $.getJSON("https://api.guildwars2.com/v1/map_names.json");
    var mapFloorRequest = $.getJSON(mapFloorUrl);
    var datas_regions = [];
    var explorablesZones = [];
    var explorablesZonesId = [];


    var map, southwest, northeast, northwest, southeast;

    southwest = fromPointToLatLng(new google.maps.Point(0, 32768), 7);
    northeast = fromPointToLatLng(new google.maps.Point(32768, 0), 7);
    // var map_bounds = new google.maps.LatLngBounds(southwest, northeast);

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
                GW2WorldMapOpts = {
                    center : new google.maps.LatLng(0, 0),
                    zoom : 2,
                    mapTypeId : "custom",
                    mapTypeControl : false,
                    panControl: false,
                    streetViewControl: false,
                    backgroundColor : '#fff'
                };


            map = new google.maps.Map(document.getElementById("GW2map"), GW2WorldMapOpts);
            map.mapTypes.set('custom', GW2WorldMap);

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
            var mapNamesDeferred = $.Deferred();
            mapNamesDeferred.done($.proxy(mapNamesManager.display_regions, mapNamesManager));

            var mapDrawingDeferred = $.Deferred();
            mapDrawingDeferred.done(ui.draw_explorables_zones);

            $.when(mapNamesRequest).done(ui.get_explorables_zones_id)
            $.when(mapFloorRequest).done([ui.get_datas_regions, ui.get_explorables_zones]);

            mapNamesDeferred.resolve(datas_regions);
            mapDrawingDeferred.resolve(explorablesZones, map)


        },
        get_explorables_zones_id: function(mapNamesRequestResult) {
            var mapNamesDatas = mapNamesRequestResult;
            for (var i in mapNamesDatas) {
                explorablesZonesId.push(mapNamesDatas[i]["id"]);
            };
        },
        get_datas_regions: function(mapFloorRequestResult) {
            var mapFloorDatas = mapFloorRequestResult.regions;
            for (var r in mapFloorDatas) {
                // overlay = new nameOverlay(map_bounds, data1.mapFloorDatas[region].name, map);
                datas_regions.push([mapFloorDatas[r]['name'], mapFloorDatas[r]['label_coord']]);
            }
        },
        get_explorables_zones: function(mapFloorRequestResult) {
            var mapFloorDatas = mapFloorRequestResult.regions;
            for (var r in mapFloorDatas) {
                for(var mapId in mapFloorDatas[r]['maps']) {
                    //City are not present in map_names.json but we could find them in map_floor.json
                    //because minLvl is 0 and maxLvl 80
                    var minLvl = mapFloorDatas[r]['maps'][mapId]['min_level'];
                    var maxLvl = mapFloorDatas[r]['maps'][mapId]['max_level'];
                    if(explorablesZonesId.indexOf(mapId) != -1 || (minLvl == 0 && maxLvl == 80)) {
                        explorablesZones.push([mapFloorDatas[r]['maps'][mapId]['name'], mapFloorDatas[r]['maps'][mapId]['continent_rect']])
                    }
                }
            }
        },
        draw_explorables_zones: function(map_datas, map) {
            var len = map_datas.length;
            // https://google-developers.appspot.com/maps/documentation/javascript/examples/polygon-simple
            for(var i=0; i<len; i++) {
                var mapRect = map_datas[i][1];

                // [[17664, 11264],[21760, 13312]] -> [northwest, southeast]
                var mapRectNorthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[0][1]), 7),
                    mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[0][1]), 7),
                    mapRectSouthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[1][1]), 7),
                    mapRectSoutheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[1][1]), 7);

                var mapRectPolygon = new google.maps.Polygon({
                    paths: [
                        mapRectNortheast,
                        mapRectNorthwest,
                        mapRectSouthwest,
                        mapRectSoutheast,
                        mapRectNortheast
                    ],
                    strokeColor: '#FFCC00',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#FF0000',
                    fillOpacity: 0.35
                  });

                mapRectPolygon.setMap(map);

            }
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
