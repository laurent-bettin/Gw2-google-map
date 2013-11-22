MapNames = function(map, maxZoom) {
    this.map = map;
    this.infosRegion = [];
    this.maxZoom = maxZoom;
    this.infosWindows = [];
};

MapNames.prototype.set_infos_region = function(infosRegion) {
    this.infosRegion = infosRegion;
};

MapNames.prototype.create_infowindow = function() {
    var lenIr = this.infosRegion.length;
    for (var i=0; i<lenIr; i++) {
        // overlay = new nameOverlay(mapBound, data.regions[region].name, map);
        var mapPoint = new google.maps.Point(this.infosRegion[i][1][0], this.infosRegion[i][1][1]),
            infowindow = new google.maps.InfoWindow({
                content: '<b>'+this.infosRegion[i][0]+'</b>',
                position: fromPointToLatLng(mapPoint, this.maxZoom)
            });
        this.infosWindows.push(infowindow);
    }
};

MapNames.prototype.update_display = function() {
    var lenIw = this.infosWindows.length;
    var lenIr = this.infosRegion.length;
    if(!lenIw) {
        this.create_infowindow();
    }
    var zoom_level = this.map.getZoom();
    if(zoom_level === 2) {
        for(var i=0; i<lenIr; i++) {
            this.infosWindows[i].open(this.map);
        }
    }else{
        for(var i=0; i<lenIr; i++) {
            this.infosWindows[i].close();
        }
    }
};
