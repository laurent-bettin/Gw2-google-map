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

    var map = null;
    var MAXZOOM = 7;
    var MINZOOM = 2;
    var explorablesZonesId = [];
    var locations = {};
    locations['explorable_zones'] = [];
    locations['areas'] = [];
    locations['regions'] = {};
    var pois = {};
    pois['landmark'] = [];
    pois['waypoint'] = [];
    pois['vista'] = [];
    pois['unlock'] = [];
    var southwest = fromPointToLatLng(new google.maps.Point(0, 32768), MAXZOOM);
    var northeast = fromPointToLatLng(new google.maps.Point(32768, 0), MAXZOOM);
    var allowedBounds = new google.maps.LatLngBounds(southwest, northeast);

    var overlay;

    //Handle multiple ajax request then notify when complete
    //TODO : fail case
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
            var _this = this;
            var len = urls.length;

            for(var i = 0; i < len; i++) {
                this.result.push(this.requestDatas(urls[i]));
            }

            // http://stackoverflow.com/questions/6538470/jquery-deferred-waiting-for-multiple-ajax-requests-to-finish
            $.when.apply($, this.result)
                .done($.proxy(_this.resolveDeferred, _this));

            return this.d.promise();
        }
    };

    //initialize gmap
    var gmap = {
        lastValidCenter: null,
        Gw2MapUiOptions: {
            tileSize: new google.maps.Size(256, 256),
            maxZoom: MAXZOOM,
            minZoom: MINZOOM,
            name: "GW2WorldMap"
        },
        init: function() {
            this.Gw2MapUiOptions.getTileUrl = this.getTileUrl;
            var GW2WorldMap = new google.maps.ImageMapType(this.Gw2MapUiOptions),
                GW2WorldMapOpts = {
                    center : new google.maps.LatLng(0, 0),
                    zoom : MINZOOM,
                    mapTypeId : "custom",
                    mapTypeControl : false,
                    panControl: false,
                    streetViewControl: false,
                    backgroundColor : '#fff'
                };


            var map = new google.maps.Map(document.getElementById("GW2map"), GW2WorldMapOpts);
            map.mapTypes.set('custom', GW2WorldMap);

            this.lastValidCenter = map.getCenter();

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
        limitPanning: function() {
            var mapBounds = map.getBounds();
            var mapCenter = map.getCenter();

            var maxX = mapBounds.getNorthEast().lng();
            var minX = mapBounds.getSouthWest().lng();
            var allowedMaxX = allowedBounds.getNorthEast().lng();
            var allowedMinX = allowedBounds.getSouthWest().lng();

            var maxY = mapBounds.getNorthEast().lat();
            var minY = mapBounds.getSouthWest().lat();
            var allowedMaxY = allowedBounds.getNorthEast().lat();
            var allowedMinY = allowedBounds.getSouthWest().lat();

            if(
                maxY < allowedMaxY &&
                maxY > mapCenter.lat() &&
                minY > allowedMinY &&
                minY < mapCenter.lat() &&
                maxX < allowedMaxX &&
                maxX > mapCenter.lng() &&
                minX > allowedMinX &&
                minX < mapCenter.lng()
               ) {
                this.lastValidCenter = map.getCenter();
                return;
            }

            map.panTo(this.lastValidCenter);
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

    var markers = {
        waypoints: [],
        createWaypoints: function() {
            var len = pois['waypoint'].length;
            var waypointId = datasParser.filesRequestResult['map_waypoint']['file_id'];
            var waypointSignature = datasParser.filesRequestResult['map_waypoint']['signature'];
            var url = 'https://render.guildwars2.com/file/'+waypointSignature+'/'+waypointId+'.png';

            var image = {
                url: url,
                size: new google.maps.Size(64, 64),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(16, 16),
                scaledSize: new google.maps.Size(32, 32)
            };

            for(var i=0; i<len; i++) {
                var location = fromPointToLatLng(new google.maps.Point(pois['waypoint'][i][0], pois['waypoint'][i][1]), MAXZOOM);
                var marker = new google.maps.Marker({
                    position: location,
                    icon: image
                });
                this.waypoints.push(marker);
            }
        },
        toggleWaypoints: function() {
            var len = this.waypoints.length;
            for(var i=0; i<len; i++) {
                var inArea = map.getBounds().contains(this.waypoints[i].getPosition());
                if (this.waypoints[i].getMap() == null) {
                    if(inArea) {
                        this.waypoints[i].setMap(map);
                    }
                }else{
                    if(!inArea) {
                        this.waypoints[i].setMap(null);
                    }
                }
            }
        },
        init: function() {

        }
    };

    var mapNames = {
        infosWindows: [],
        overlay: [],
        areaOverlay: [],
        createInfowindow: function() {
            for (var r in locations.regions) {
                // overlay = new nameOverlay(mapBound, data.locations[region].name, map);
                var mapPoint = new google.maps.Point(locations.regions[r]['label_coord'][0], locations.regions[r]['label_coord'][1]);
                var latLng = fromPointToLatLng(mapPoint, MAXZOOM);

                //Get the latLngBound of the global bound of the regions
                var mapRect = locations.regions[r]['global_continent_rect'];
                var mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[0][1]), 7);
                var mapRectSouthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[1][1]), 7);
                var mapBounds = new google.maps.LatLngBounds(mapRectSouthwest, mapRectNortheast);

                var p = $('<p />');
                p
                    .data('mapBounds', mapBounds)
                    .addClass('continent-name')
                    .html(r);

                var infowindow = new google.maps.InfoWindow({
                        content: p[0],
                        position: latLng
                    });

                this.infosWindows.push(infowindow);
            }
        },
        showInfosWindow: function () {
            var lenIw = this.infosWindows.length;
            for(var i = 0; i < lenIw; i++) {
                if (this.infosWindows[i].getMap() == null) {
                    this.infosWindows[i].open(map);
                }
            }
        },
        hideInfosWindow: function() {
            var lenIw = this.infosWindows.length;
            for(var i = 0; i < lenIw; i++) {
                this.infosWindows[i].close();
            }
        },
        hideMapElement: function(elements) {
            var lenElements = elements.length;
            for(var i = 0; i < lenElements; i++) {
                if(elements[i].getMap() != null) {
                    elements[i].setMap(null);
                }
            }
        },
        toggleOverlay: function(overlayDatas) {
            var lenOverlayDatas = overlayDatas.length;
            for(var i = 0; i < lenOverlayDatas; i++) {
                // console.log(map.getBounds().contains(this.overlayDatas[i].bounds_.getCenter()) == true)
                // overlayDatas could contain instance of latLng or latLngBound to determine the type of instance
                // we test if the method getCenter exist : if getCenter != undefined -> latLngBound
                var center = overlayDatas[i].bounds_.getCenter ?
                    overlayDatas[i].bounds_.getCenter() : overlayDatas[i].bounds_;
                //display only if center is in visible area of the map
                if(map.getBounds().contains(center) === true) {
                    //call setMap only if element not on map
                    if(overlayDatas[i].getMap() == null) {
                        overlayDatas[i].setMap(map);
                    }
                }else{
                    if(overlayDatas[i].getMap() != null) {
                        overlayDatas[i].setMap(null);
                    }
                }
            }
        },
        updateDisplay: function() {
            var zoomLvl = map.getZoom();
            if(zoomLvl === 2) {
                var lenIw = this.infosWindows.length;
                if(!lenIw) {
                    this.createInfowindow();
                }
                this.showInfosWindow();
                this.hideMapElement(this.overlay);
            }else{
                this.hideInfosWindow();
            }

            if(zoomLvl > 2 && zoomLvl <= 5) {
                var lenOverlay = this.overlay.length;
                if(!lenOverlay) {
                    this.overlay = this.setOverlay(locations['explorable_zones']);
                }
                this.hideMapElement(this.areaOverlay);
                this.toggleOverlay(this.overlay);
            }

            if(zoomLvl > 5) {
                var lenAreaOverlay = this.areaOverlay.length;
                if(!lenAreaOverlay) {
                    this.areaOverlay = this.setOverlay(locations['areas']);
                }
                this.hideMapElement(this.overlay);
                this.toggleOverlay(this.areaOverlay);
            }

            if(zoomLvl > 3) {
                var lenWaypoint = markers.waypoints.length;
                if(!lenWaypoint) {
                    markers.createWaypoints();
                }
                markers.toggleWaypoints();
            }

            if(zoomLvl <= 3) {
                this.hideMapElement(markers.waypoints);
            }

        },
        setOverlay: function(overlayZone) {
            var len = overlayZone.length;
            var overlayList = [];
            var mapBounds;
            var mapRectNortheast;
            var mapRectSouthwest;
            // https://google-developers.appspot.com/maps/documentation/javascript/examples/polygon-simple
            for(var i = 0; i<len; i++) {
                // console.log(overlayZone[i][1].instanceof(array))
                var mapRect = overlayZone[i][1];
                // [[17664, 11264],[21760, 13312]] -> [northwest, southeast]

                //mapRect[0] could be array or number depending on JSON data were a map_rect [[x, y], [x, y]]
                // or a point [x, y]
                if(Object.prototype.toString.call(mapRect[0]) === '[object Array]') {
                    mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[0][1]), MAXZOOM);
                    mapRectSouthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[1][1]), MAXZOOM);
                    mapBounds = new google.maps.LatLngBounds(mapRectSouthwest, mapRectNortheast);
                }else{
                    mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[0], mapRect[1]), MAXZOOM);
                    mapBounds = mapRectNortheast;
                }
                var overlayer = new NameOverlay(mapBounds, overlayZone[i][0], map);
                overlayList.push(overlayer);
            }
            return overlayList;
        },
        init: function() {

        }
    };

    var datasParser = {
        mapNamesRequestResult: null,
        mapFloorRequestResult: null,
        filesRequestResult: null,
        setMapNamesRequestResult: function(datas) {
            this.mapNamesRequestResult = datas;
        },
        setMapFloorRequestResult: function(datas) {
            this.mapFloorRequestResult = datas;
        },
        setFilesRequestResult: function(datas) {
            this.filesRequestResult = datas;
        },
        getExplorablesZonesId: function() {
            var mapNamesDatas = this.mapNamesRequestResult;
            for (var i in mapNamesDatas) {
                explorablesZonesId.push(mapNamesDatas[i]["id"]);
            }
        },
        //sort datas in varous type: locations / explorables zones / area
        getExplorablesZones: function() {
            var mapFloorDatas = this.mapFloorRequestResult.regions;

            for (var r in mapFloorDatas) {
                var regionName = mapFloorDatas[r]['name'];
                locations['regions'][regionName] = {};
                locations['regions'][regionName]['label_coord'] = mapFloorDatas[r]['label_coord'];
                for(var mapId in mapFloorDatas[r]['maps']) {
                    var mapFloor = mapFloorDatas[r]['maps'][mapId];
                    //City are not present in map_names.json but we could find them in map_floor.json
                    //because minLvl is 0 and maxLvl 80
                    var minLvl = mapFloor['min_level'];
                    var maxLvl = mapFloor['max_level'];
                    if(explorablesZonesId.indexOf(mapId) != -1 || (minLvl === 0 && maxLvl === 80)) {
                        var mapName = mapFloor['name'];
                        var continentRect = mapFloor['continent_rect'];
                        // locations[regionName]['explorable_zones'][mapName] = {}
                        // locations[regionName]['explorable_zones'][mapName]['continent_rect'] = $.extend(true, {}, continentRect);
                        locations['explorable_zones'].push([mapName, $.extend(true, {}, continentRect)]);

                        //get the global bound of all the maps of the regions
                        //search the min/max value of the current map bounf of the region for northEast and southWest
                        var globalContinentRect = locations['regions'][regionName];
                        if(!globalContinentRect['global_continent_rect']) {
                            globalContinentRect['global_continent_rect'] = continentRect;
                        }else{
                            globalContinentRect['global_continent_rect'][0][0] =
                                globalContinentRect['global_continent_rect'][0][0] <=
                                continentRect[0][0] ?
                                globalContinentRect['global_continent_rect'][0][0] : continentRect[0][0];
                            globalContinentRect['global_continent_rect'][0][1] =
                                globalContinentRect['global_continent_rect'][0][1] <=
                                continentRect[0][1] ?
                                globalContinentRect['global_continent_rect'][0][1] : continentRect[0][1];

                            globalContinentRect['global_continent_rect'][1][0] =
                                globalContinentRect['global_continent_rect'][1][0] >=
                                continentRect[1][0] ?
                                globalContinentRect['global_continent_rect'][1][0] : continentRect[1][0];
                            globalContinentRect['global_continent_rect'][1][1] =
                                globalContinentRect['global_continent_rect'][1][1] >=
                                continentRect[1][1] ?
                                globalContinentRect['global_continent_rect'][1][1] : continentRect[1][1];
                        }
                    }
                    for(var sector in mapFloor['sectors']) {
                        var areaName = mapFloor['sectors'][sector]['name'];
                        var areaRect = mapFloor['sectors'][sector]['coord'];
                        // locations[regionName]['areas'][areaName] = {};
                        // locations[regionName]['areas'][areaName]['label_coord'] = areaRect;
                        locations['areas'].push([areaName, areaRect]);
                    }

                    for(var poi in mapFloor['points_of_interest'] ) {
                        // var poi = mapFloorDatas[r]['maps'][mapId]['points_of_interest'];
                    // console.log(mapFloor['points_of_interest'][poi]['type'])
                        var poiType = mapFloor['points_of_interest'][poi]['type'];
                        // console.log(poiType)
                        // console.log(typeof(poiType))
                        if(!pois[poiType]) {
                            pois[poiType] = [];
                        }else{
                            pois[poiType].push(mapFloor['points_of_interest'][poi]['coord']);
                        }
                    }

                }

            }

        }
    };

    var ui = {
        initialize: function () {
            var _this = this;

            map = gmap.init();

            //datas to load
            var urls = [
                'https://api.guildwars2.com/v1/map_floor.json?continent_id=1&floor=2',
                'https://api.guildwars2.com/v1/map_names.json',
                'https://api.guildwars2.com/v1/files.json'
            ];

            //callback when data will be ready
            var callbacks = [
                $.proxy(datasParser.setMapFloorRequestResult, datasParser),
                $.proxy(datasParser.setMapNamesRequestResult, datasParser),
                $.proxy(datasParser.setFilesRequestResult, datasParser)
            ];

            //stack of function for parsing datas when they will be ready
            var stack = $.Callbacks('once');
            stack.add([
                $.proxy(datasParser.getExplorablesZonesId, datasParser),
                $.proxy(datasParser.getExplorablesZones, datasParser),
                $.proxy(_this.drawExplorablesZones, _this),
                $.proxy(mapNames.updateDisplay, mapNames)
            ]);

            //loading datas and wait for resolve
            var datasDeferred = dataLoader.init(urls, callbacks);

            datasDeferred.done(_this.applyCallbacks)
                .done(stack.fire);

            google.maps.event.addListener(map, 'zoom_changed', function(ev) {
                // console.log('zoom_changed')
                // mapNames.updateDisplay();
            });

            google.maps.event.addListener(map, 'idle', $.proxy(mapNames.updateDisplay, mapNames));

            //fit the map on the region
            $(document).on('click', '.continent-name', function() {
                // console.log($(this).data('latLng'));
                map.fitBounds($(this).data('mapBounds'));
            });

            var zoomChanged = false;

            google.maps.event.addListener(map, 'center_changed', $.proxy(gmap.limitPanning, gmap));

            google.maps.event.addListener(map, 'zoom_changed', function() {
                zoomChanged = true;
            });

            google.maps.event.addListener(map, 'bounds_changed', function() {
                //Zoom out could cause axtra panning of the map
                if(zoomChanged) {
                    var mapBounds = map.getBounds();
                    var mapCenter = map.getCenter();

                    var maxX = mapBounds.getNorthEast().lng();
                    var minX = mapBounds.getSouthWest().lng();
                    var allowedMaxX = allowedBounds.getNorthEast().lng();
                    var allowedMinX = allowedBounds.getSouthWest().lng();

                    var maxY = mapBounds.getNorthEast().lat();
                    var minY = mapBounds.getSouthWest().lat();
                    var allowedMaxY = allowedBounds.getNorthEast().lat();
                    var allowedMinY = allowedBounds.getSouthWest().lat();

                    if (map.getZoom() != MINZOOM) {
                        var x = mapCenter.lng();
                        var y = mapCenter.lat();

                        //We check if current value are outside the limit
                        //if it is calculate the nearest value in the limit
                        if(maxY > allowedMaxY || maxY < y) {
                            y = allowedMaxY - ((maxY - minY)/2);
                        }

                        if(minY < allowedMinY || minY > y) {
                            y = allowedMinY + ((maxY - minY)/2);
                        }

                        if(maxX > allowedMaxX || maxX < x) {
                            x -= allowedMaxX - Math.abs(maxX);
                        }

                        if(minX < allowedMinX || minX > x) {
                            x += allowedMinX - Math.abs(minX);
                        }
                    }else{
                        var x= 0;
                        var y = 0;
                    }

                    if (x != mapCenter.lng() || y != mapCenter.lat()) {
                        gmap.lastValidCenter = new google.maps.LatLng(y, x);
                        map.setCenter(new google.maps.LatLng(y, x));
                    }

                    zoomChanged = false;

                }

            });

            // overlay = new NameOverlay(map_bounds, data1.mapFloorDatas[region].name, mapRef);


            // map.overlayMapTypes.insertAt(0, new CoordMapType(new google.maps.Size(256, 256)));
            // var p = new google.maps.Point(12839.8, 12483.8)
            // var myLatLng = fromPointToLatLng(p, 7);
            // var marker = this.addMarker(myLatLng, map);
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
        drawExplorablesZones: function() {
            var len = locations['explorable_zones'].length;
            // https://google-developers.appspot.com/maps/documentation/javascript/examples/polygon-simple
            for(var i = 0; i < len; i++) {
                var mapRect = locations['explorable_zones'][i][1];
                // [[17664, 11264],[21760, 13312]] -> [northwest, southeast]
                var mapRectNorthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[0][1]), MAXZOOM);
                var mapRectNortheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[0][1]), MAXZOOM);
                var mapRectSouthwest = fromPointToLatLng(new google.maps.Point(mapRect[0][0], mapRect[1][1]), MAXZOOM);
                var mapRectSoutheast = fromPointToLatLng(new google.maps.Point(mapRect[1][0], mapRect[1][1]), MAXZOOM);
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
