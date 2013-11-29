NameOverlay.prototype = new google.maps.OverlayView();

// https://developers.google.com/maps/documentation/javascript/examples/overlay-simple
//Bounds could be instance of latLngBouns or latLng
function NameOverlay (bounds, content, map) {
    // Initialize all properties.
    this.bounds_ = bounds;
    this.content_ = content;
    this.map_ = map;

    // Define a property to hold the image's div. We'll
    // actually create this div upon receipt of the onAdd()
    // method so we'll leave it null for now.
    this.div_ = null;

    // Explicitly call setMap on this overlay.
    // this.setMap(map);
};

NameOverlay.prototype.hide = function() {
  if (this.div_) {
    // The visibility property must be a string enclosed in quotes.
    this.div_.style.visibility = 'hidden';
  }
};

NameOverlay.prototype.show = function() {
  if (this.div_) {
    this.div_.style.visibility = 'visible';
  }
};

NameOverlay.prototype.toggle = function() {
  if (this.div_) {
    if (this.div_.style.visibility == 'hidden') {
      this.show();
    } else {
      this.hide();
    }
  }
};

NameOverlay.prototype.onAdd = function() {
    var div = document.createElement('div');
    div.style.borderStyle = 'none';
    div.style.borderWidth = '1px';
    div.style.position = 'absolute';

    //creation d'un paragraphe
    var txt = document.createTextNode(this.content_);
    var paragraph = document.createElement('p');
    if(!this.bounds_.lat) {
        paragraph.className = 'region-label';
    }else{
        paragraph.className = 'area-label';
    }
    paragraph.appendChild(txt);
    div.appendChild(paragraph);

    this.div_ = div;

    // Add the element to the "overlayLayer" pane.
    var panes = this.getPanes();
    panes.overlayLayer.appendChild(div);
};

NameOverlay.prototype.draw = function() {

    // We use the south-west and north-east
    // coordinates of the overlay to peg it to the correct position and size.
    // To do this, we need to retrieve the projection from the overlay.
    var overlayProjection = this.getProjection();
    var div = this.div_;

    if(!this.bounds_.lat) {

        // Retrieve the south-west and north-east coordinates of this overlay
        // in LatLngs and convert them to pixel coordinates.
        // We'll use these coordinates to resize the div.
        var sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
        var ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

        // Resize the image's div to fit the indicated dimensions.
        div.style.left = sw.x + 'px';
        div.style.top = ne.y + 'px';
        div.style.width = (ne.x - sw.x) + 'px';
        div.style.height = (sw.y - ne.y) + 'px';
        div.style.lineHeight = (sw.y - ne.y) + 'px';
    }else{
        var point = this.getProjection().fromLatLngToDivPixel(this.bounds_);
        div.style.left = (point.x - div.clientWidth/2) + 'px';
        div.style.top = (point.y - div.clientHeight/2) + 'px';
    }

};

NameOverlay.prototype.onRemove = function() {
    this.div_.parentNode.removeChild(this.div_);
    this.div_ = null;
};
