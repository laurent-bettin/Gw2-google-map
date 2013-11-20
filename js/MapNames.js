MapNames = function(map, maxZoom) {
    this._map = map;
    this._names = null;
    this._maxZoom = maxZoom;
    this.infosWindows = [];
}

MapNames.prototype.display_infowindow = function() {
    var namesLength = this._names.length;
    for (var i=0; i<namesLength; i++) {
        // overlay = new nameOverlay(mapBound, data.regions[region].name, map);
        var mapPoint = new google.maps.Point(this._names[i][1][0], this._names[i][1][1]),
            infowindow = new google.maps.InfoWindow({
                content: '<b>'+this._names[i][0]+'</b>',
                position: fromPointToLatLng(mapPoint, this._maxZoom)
            });
        this.infosWindows.push(infowindow);
        infowindow.open(this._map);
    }
}

MapNames.prototype.display_regions = function(names) {
    var zoom_level = this._map.getZoom();
    this._names = names;
    if(zoom_level === 2) {
        this.display_infowindow();
    }
};

MapNames.prototype.update_display = function() {
    var len = this.infosWindows.length;
    var zoom_level = this._map.getZoom();
    if(zoom_level === 2) {
        this.display_infowindow();
    }else{
        for(var i=0; i<len; i++) {
            this.infosWindows[i].close();
        }
    }
}
