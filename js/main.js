function delay(a){var b=(new Date).getTime()+a;while(b>(new Date).getTime());}
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

    var datas_regions = [];
    var explorablesZones = [];
    var explorablesZonesId = [];
    var mapNamesManager;


    var southwest, northeast;

    southwest = fromPointToLatLng(new google.maps.Point(0, 32768), 7);
    northeast = fromPointToLatLng(new google.maps.Point(32768, 0), 7);
    // var map_bounds = new google.maps.LatLngBounds(southwest, northeast);

    var overlay;

    var dataLoader = {
        d: $.Deferred(),
        result: [],
        setters: [],
        resolveDeferred: function() {
            this.d.resolve(this.result, this.setters)
        },
        requestDatas: function(url, key) {
            var request = $.getJSON(url);
            return request;
        },
        init: function(urls, setters) {
            this.setters = setters;
            var _this = this,
                len = urls.length;

            for(var i=0; i<len; i++) {
                this.result.push(this.requestDatas(urls[i]));
            }

            // http://stackoverflow.com/questions/6538470/jquery-deferred-waiting-for-multiple-ajax-requests-to-finish
            $.when.apply($, this.result)
                .done($.proxy(_this.resolveDeferred, _this));

            return this.d.promise();
        }
    };

    // var dataLoader = {
    //     d: $.Deferred(),
    //     datas: {},
    //     resolveDeferred: function() {
    //         this.d.resolve(this.datas)
    //     },
    //     setDatas: function(datas, key) {
    //         this.datas[key['key']] = datas[0];
    //     },
    //     requestDatas: function(url, key) {
    //         var _this = this;
    //         var request = $.getJSON(url);
    //         $.when(request, {'key': key})
    //             .done($.proxy(_this.setDatas, _this));
    //         return request;
    //     },
    //     init: function(keyUrl) {
    //         var _this = this,
    //             result = [];

    //         for(var r in keyUrl) {
    //             result.push(this.requestDatas(keyUrl[r], r));
    //         }

    //         // http://stackoverflow.com/questions/6538470/jquery-deferred-waiting-for-multiple-ajax-requests-to-finish
    //         $.when.apply($, result)
    //             .done($.proxy(_this.resolveDeferred, _this));

    //         return this.d.promise();
    //     }
    // };

    var gmap = {
        Gw2MapUiOptions: {
            tileSize: new google.maps.Size(256, 256),
            maxZoom: 7,
            minZoom: 2,
            name: "GW2WorldMap"
        },
        getMaxZoom: function() {
            return this.Gw2MapUiOptions.maxZoom;
        },
        init: function() {
            this.Gw2MapUiOptions.getTileUrl = this.getTileUrl;
            var GW2WorldMap = new google.maps.ImageMapType(this.Gw2MapUiOptions),
                GW2WorldMapOpts = {
                    center : new google.maps.LatLng(0, 0),
                    zoom : 2,
                    mapTypeId : "custom",
                    mapTypeControl : false,
                    panControl: false,
                    streetViewControl: false,
                    backgroundColor : '#fff'
                };


            var map = new google.maps.Map(document.getElementById("GW2map"), GW2WorldMapOpts);
            map.mapTypes.set('custom', GW2WorldMap);

            return map;
        },
        getTileUrl: function(coord, zoom) {
            var normalizedCoord = gmap.getNormalizedCoord(coord, zoom);
            if (!normalizedCoord) {
                return null;
            }
            // https://tiles.guildwars2.com/1/1/zoom/{x}/{y}.jpg
            return "https://tiles.guildwars2.com/1/1/"+zoom+"/"+normalizedCoord.x+"/"+normalizedCoord.y+".jpg";
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

    var ui = {
        mapRef: null,
        mapNamesRequestResult: null,
        mapFloorRequestResult: null,
        initialize: function () {
            var _this = this;

            var urls = [
                'https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=2',
                'https://api.guildwars2.com/v1/map_names.json'
            ]

            var setters = [
                this.set_map_floor_request_result,
                this.set_map_names_request_result
            ]

            var p = dataLoader.init(urls, setters);

            this.mapRef = gmap.init();
            mapNamesManager = new MapNames(_this.mapRef, gmap.getMaxZoom());

            var stack = $.Callbacks();
            stack.add([
                this.get_explorables_zones_id,
                this.get_datas_regions,
                this.get_explorables_zones,
                this.draw_explorables_zones,
                this.update_map_name_manager,
                $.proxy(mapNamesManager.update_display, mapNamesManager)
            ])

            $.when(p.done($.proxy(_this.apply_setter, _this)))
                .then($.proxy(stack.fire, _this));

            google.maps.event.addListener(_this.mapRef, 'zoom_changed', function(ev) {
                mapNamesManager.update_display();
            });


            // map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));
            // var p = new google.maps.Point(12839.8, 12483.8)
            // var myLatLng = fromPointToLatLng(p, 7);
            // var marker = this.addMarker(myLatLng, this.mapRef);
            // this.addMarker(Snowden_Drifts_Southwest);
            // this.addMarker(Snowden_Drifts_Southeast);
            // this.addMarker(Snowden_Drifts_Northwest);
            // this.addMarker(new google.maps.LatLng(-85, 180));

        },
        apply_setter: function(datas, setters) {
            var len = setters.length;
            for (var i=0; i<len; i++) {
                if($.isFunction(setters[i])) {
                    setters[i].call(this, datas[i]['responseJSON'])
                }
            }
        },
        set_map_names_request_result: function(datas) {
            this.mapNamesRequestResult = datas;
        },
        set_map_floor_request_result: function(datas) {
            this.mapFloorRequestResult = datas;
        },
        update_map_name_manager: function() {
            mapNamesManager.set_infos_region(datas_regions);
        },
        get_explorables_zones_id: function() {
            var mapNamesDatas = this.mapNamesRequestResult;
            for (var i in mapNamesDatas) {
                explorablesZonesId.push(mapNamesDatas[i]["id"]);
            };
        },
        get_datas_regions: function() {
            var mapFloorDatas = this.mapFloorRequestResult.regions;
            for (var r in mapFloorDatas) {
                // overlay = new nameOverlay(map_bounds, data1.mapFloorDatas[region].name, mapRef);
                datas_regions.push([mapFloorDatas[r]['name'], mapFloorDatas[r]['label_coord']]);
            }
        },
        get_explorables_zones: function() {
            var mapFloorDatas = this.mapFloorRequestResult.regions;
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
        draw_explorables_zones: function() {
            var map = this.mapRef,
                len = explorablesZones.length;
            // https://google-developers.appspot.com/maps/documentation/javascript/examples/polygon-simple
            for(var i=0; i<len; i++) {
                var mapRect = explorablesZones[i][1];

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
        addMarker : function (location, map) {
            var marker = new google.maps.Marker({
                position: location,
                map: map
            });
            return marker;
        }
    };

    context.ui = ui;

})(front)

$(document).ready($.proxy(front.ui.initialize, front.ui));
//$(window).load(function() { front.ui.init() });
