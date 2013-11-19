MapNames = function(map, maxZoom) {
    this._map = map;
    this._names = null;
    this._maxZoom = maxZoom;
    this.infos_windows = [];
}

MapNames.prototype.display_infowindow = function() {
    var names_length = this._names.length;
    for (var i=0; i<names_length; i++) {
        // overlay = new nameOverlay(mapBound, data.regions[region].name, map);
        var position_ = new google.maps.Point(this._names[i][1][0], this._names[i][1][1]),
            infowindow = new google.maps.InfoWindow({
            content: '<b>'+this._names[i][0]+'</b>',
            position: fromPointToLatLng(position_, this._maxZoom)
        });
        this.infos_windows.push(infowindow);
        infowindow.open(this._map);
    }
}

MapNames.prototype.display_names = function(names) {
    var zoom_level = this._map.getZoom();
    this._names = names;
    if(zoom_level === 2) {
        this.display_infowindow();
    }
};

MapNames.prototype.update_display = function() {
    var l = this.infos_windows.length;
    var zoom_level = this._map.getZoom();
    if(l) {
        if(zoom_level === 2) {
            this.display_infowindow();
        }else{
            for(var i=0; i<l; i++) {
                this.infos_windows[i].close();
            }
        }
    }
}
