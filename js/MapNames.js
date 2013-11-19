MapNames = function(map, names) {
    this._map = map;
    this._names = names;
    this.infos_windows = [];
}

MapNames.prototype.display_names = function() {
    var zoom_level = this._map.getZoom();
    if(zoom_level === 2) {
        var names_length = this._names.length;
        for (var i=0; i<names_length; i++) {
            // overlay = new nameOverlay(mapBound, data.regions[region].name, map);
            var position_ = new google.maps.Point(this._names[i][1][0], this._names[i][1][1]),
                infowindow = new google.maps.InfoWindow({
                content: '<b>'+this._names[i][0]+'</b>',
                position: fromPointToLatLng(position_, 7)
            });
            this.infos_windows.push(infowindow);
            infowindow.open(this._map);
        }
    }

};
