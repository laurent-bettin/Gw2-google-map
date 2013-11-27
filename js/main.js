// http://webbricks.org/bricks/delay/
function delay(a){var b=(new Date()).getTime()+a;while(b>(new Date()).getTime());}

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
    var size = (1 << max_zoom) * 256;
    var lat = (2 * Math.atan(Math.exp((point.y - size/2) / -(size/(2 * Math.PI)))) - (Math.PI / 2)) * (180/Math.PI);
    var lng = (point.x - size/2) * (360/size);
    return new google.maps.LatLng(lat, lng);
}

(function (context) {
    "use strict";

    var explorablesZonesId = [];
    var explorablesZones = [];
    var mapNamesManager;
    var southwest = fromPointToLatLng(new google.maps.Point(0, 32768), 7);
    var northeast = fromPointToLatLng(new google.maps.Point(32768, 0), 7);
    // var map_bounds = new google.maps.LatLngBounds(southwest, northeast);

    var overlay;

    var dataLoader = {
        d: $.Deferred(),
        result: [],
        callbacks: [],
        resolveDeferred: function() {
            this.d.resolve(this.result, this.callbacks);
        },
        requestDatas: function(url, key) {
            var request = $.getJSON(url);
            return request;
        },
        init: function(urls, callbacks) {
            this.callbacks = callbacks;
            var _this = this,
                len = urls.length;

            for(var i = 0; i < len; i++) {
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

    var mapNames = {
        infosWindows: [],
        regions: null,
        overlay: [],
        map: null,
        maxZoom: 0,
        setRegions: function() {
            this.regions = ui.getDatasRegions();
        },
        createInfowindow: function() {
            var lenIr = this.regions.length;
            for (var i = 0; i < lenIr; i++) {
                // overlay = new nameOverlay(mapBound, data.regions[region].name, map);
                var mapPoint = new google.maps.Point(this.regions[i][1][0], this.regions[i][1][1]);
                var infowindow = new google.maps.InfoWindow({
                    content: '<b>'+this.regions[i][0]+'</b>',
                    position: fromPointToLatLng(mapPoint, this.maxZoom)
                });
                this.infosWindows.push(infowindow);
            }
        },
        updateDisplay: function() {
            var lenIw = this.infosWindows.length;
            var lenIr = this.regions.length;
            var lenOverlay = this.overlay.length;
            var i;
            if(!lenIw) {
                this.createInfowindow();
            }
            var zoomLvl = this.map.getZoom();
            if(zoomLvl === 2) {
                for(i = 0; i < lenIr; i++) {
                    this.infosWindows[i].open(this.map);
                }
                for(i = 0; i < lenOverlay; i++) {
                    this.overlay[i].hide();
                }
            }else{
                for(i = 0; i < lenIr; i++) {
                    this.infosWindows[i].close();
                }
            }

            if(zoomLvl > 2 && zoomLvl <= 5) {
                if(lenOverlay) {
                    for(i = 0; i < lenOverlay; i++) {
                        this.overlay[i].show();
                    }
                }else{
                    this.setOverlay();
                }
            }

            if(zoomLvl > 5 && lenOverlay) {
                for(i = 0; i < lenOverlay; i++) {
                    this.overlay[i].hide();
                }
            }

        },
        setOverlay: function() {
            var map = this.mapRef;
            var len = explorablesZones.length;
            var overlay = [];
            var maxZoom = gmap.getMaxZoom();
            // https://google-developers.appspot.com/maps/documentation/javascript/examples/polygon-simple
            for(var i = 0; i < len; i++) {
                var mapRect = explorablesZones[i][1];
                // [[17664, 11264],[21760, 13312]] -> [northwest, southeast]
                var mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[0][1]), maxZoom);
                var mapRectSouthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[1][1]), maxZoom);
                var mapBounds = new google.maps.LatLngBounds(mapRectSouthwest, mapRectNortheast);
                var overlayer = new NameOverlay(mapBounds, explorablesZones[i][0], this.map);
                this.overlay.push(overlayer);
            }
        },
        resolvedDeferred: function() {
            this.setRegions();
            // this.setOverlay();
            this.updateDisplay();
        },
        init: function(map, maxZoom) {
            this.map = map;
            this.maxZoom = maxZoom;
            var _this = this;
            var d = $.Deferred();
            d.done($.proxy(_this.resolvedDeferred, _this));
            return d;
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
            ];

            var callbacks = [
                this.setMapFloorRequestResult,
                this.setMapNamesRequestResult
            ];

            var p = dataLoader.init(urls, callbacks);

            this.mapRef = gmap.init();
            var test = mapNames.init(_this.mapRef, gmap.Gw2MapUiOptions.maxZoom);

            var stack = $.Callbacks();
            stack.add([
                this.getExplorablesZonesId,
                this.getExplorablesZones,
                this.drawExplorablesZones,
                test.resolve
            ]);

            $.when(p.done($.proxy(_this.applyCallbacks, _this)))
                .then($.proxy(stack.fire, _this));

            google.maps.event.addListener(_this.mapRef, 'zoom_changed', function(ev) {
                mapNames.updateDisplay();
            });

            // overlay = new NameOverlay(map_bounds, data1.mapFloorDatas[region].name, mapRef);


            // map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));
            // var p = new google.maps.Point(12839.8, 12483.8)
            // var myLatLng = fromPointToLatLng(p, 7);
            // var marker = this.addMarker(myLatLng, this.mapRef);
            // this.addMarker(Snowden_Drifts_Southwest);
            // this.addMarker(Snowden_Drifts_Southeast);
            // this.addMarker(Snowden_Drifts_Northwest);
            // this.addMarker(new google.maps.LatLng(-85, 180));

        },
        applyCallbacks: function(datas, callbacks) {
            var len = callbacks.length;
            for (var i=0; i<len; i++) {
                if($.isFunction(callbacks[i])) {
                    callbacks[i].call(this, datas[i]['responseJSON']);
                }
            }
        },
        setMapNamesRequestResult: function(datas) {
            this.mapNamesRequestResult = datas;
        },
        setMapFloorRequestResult: function(datas) {
            this.mapFloorRequestResult = datas;
        },
        getExplorablesZonesId: function() {
            var mapNamesDatas = this.mapNamesRequestResult;
            for (var i in mapNamesDatas) {
                explorablesZonesId.push(mapNamesDatas[i]["id"]);
            }
        },
        getDatasRegions: function() {
            var mapFloorDatas = this.mapFloorRequestResult.regions;
            var regions = [];
            for (var r in mapFloorDatas) {
                regions.push([mapFloorDatas[r]['name'], mapFloorDatas[r]['label_coord']]);
            }
            return regions;
        },
        getExplorablesZones: function() {
            var mapFloorDatas = this.mapFloorRequestResult.regions;
            for (var r in mapFloorDatas) {
                for(var mapId in mapFloorDatas[r]['maps']) {
                    //City are not present in map_names.json but we could find them in map_floor.json
                    //because minLvl is 0 and maxLvl 80
                    var minLvl = mapFloorDatas[r]['maps'][mapId]['min_level'];
                    var maxLvl = mapFloorDatas[r]['maps'][mapId]['max_level'];
                    if(explorablesZonesId.indexOf(mapId) != -1 || (minLvl === 0 && maxLvl === 80)) {
                        explorablesZones.push([mapFloorDatas[r]['maps'][mapId]['name'], mapFloorDatas[r]['maps'][mapId]['continent_rect']]);
                    }
                }
            }
        },
        drawExplorablesZones: function() {
            var map = this.mapRef;
            var len = explorablesZones.length;
            var maxZoom = gmap.getMaxZoom();
            // https://google-developers.appspot.com/maps/documentation/javascript/examples/polygon-simple
            for(var i = 0; i < len; i++) {
                var mapRect = explorablesZones[i][1];

                // [[17664, 11264],[21760, 13312]] -> [northwest, southeast]
                var mapRectNorthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[0][1]), maxZoom);
                var mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[0][1]), maxZoom);
                var mapRectSouthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[1][1]), maxZoom);
                var mapRectSoutheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[1][1]), maxZoom);
                var paths = [
                    mapRectNortheast,
                    mapRectNorthwest,
                    mapRectSouthwest,
                    mapRectSoutheast,
                    mapRectNortheast
                ];

                var mapRectPolygon = new google.maps.Polygon({
                    paths: paths,
                    strokeColor: '#edc856',
                    strokeOpacity: 1,
                    strokeWeight: 2,
                    // fillColor: '#FF0000',
                    fillOpacity: 0
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

})(front);

$(document).ready($.proxy(front.ui.initialize, front.ui));
//$(window).load(function() { front.ui.init() });
