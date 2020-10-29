// ==UserScript==
// @id             iitc-plugin-drone-view-export@azrael-42
// @name           IITC plugin: Drone View Export
// @category       Misc
// @version        0.1.0
// @updateURL      https://github.com/azrael-42/IITC-Drone-View-Export/raw/master/dronehelper.user.js
// @downloadURL    https://github.com/azrael-42/IITC-Drone-View-Export/raw/master/dronehelper.user.js
// @description    Export drone views - allows user selection of visible cells
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==
/*global $:false */
/*global portals:false */
/*global map:false */
/*global L:false */

"use strict";

function wrapper(plugin_info) {


// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN START ////////////////////////////////////////////////////////

console.log('drone-view-export');

//self.DEBUG = false;
window.plugin.droneviewexport = {
  enabled: true,
  active: false,
  selectedCells: [],
  exportData: {},
  droneViewActive: null,

  cells: {size: 16, drawOptions: {stroke:true, color: '#888888', fillColor: '#aaaaaa', fillOpacity: 0.5, interactive: false}},
  visParams: { radius: 501, cellSize: 16, type: 'cover', distance: 'haversineDistance', description: ''},


setup: function() {
    if (!this.enabled) return;
    map.on('keyup', (e) => {
      if (e.originalEvent.key === 'v') { this.toggleViewExport(); }
    }, false);
    map.on('keyup', (e) => {
      if (e.originalEvent.key === 'l') { this.loadView(); }
    }, false);
    this.layer = new L.FeatureGroup();
    this.layer.addTo(map);

    this.addLeafletControl();
  },

  addLeafletControl: function() {
    $('<style>').prop('type', 'text/css').html(`
    .leaflet-control-droneViewExport a {
      /*background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACy0lEQVQ4TyWTy2ucBRTFf+d+kzTNSDA1TlU0BIyKD2iJpSlqyKRUTMUHUhUEF65FQVzaLgLif6A0KxeVrhTd2G6cQKEJVRe+aKrWZ4sh6GiqadrpZGbukS/Z3/u79557jibqT4wXRTxb9Ji2qCLWnG5Q7Pzoy4VP1gBNTR2+pd3nQ6ReRBoO+6rxD1kpjmtyZvZVQnvco4n0n5xDgjG7eH+jNrg0urGhf264jng+rJahSXonirtMLmry4OwHwDLpESJ24fwNYszm116l8y5A0e17DbFbog3aTeYKUgtzQJMHD58mfQLrcQXTNhdRnkvHrsqOfLsEZCfecs9/KmIaeTSThShYcjKn/TNPzsveKOkJjwnfZPOVxHXIExkRkbxSgoB9ti4TWg6SdNyv/dOzzyEdEaxaDptaiH04mpbPB+o33gOS8d+CL0A3oxy29LEerj89UtHmo6K4O6HITIrgDdAA1rJKKDwEXBFasP19uYrgjyw2G8JWfWameq1SrYVzIHE1UseBccGnZbHhKZmLLnSUTa9YldZQf2ut0WhcVQmr1+vVbqVa6zgH3NOg5HngAeFLEBiPCn8D8SaF1nvQrnYH/zpz5sNrWyf0qfMIxHgpC46W5GNADdHBBFAxXA70nuTsmX6hH4u+7rltEUNHZFYd3lAygPTMtuj6qWwG3wdsgho4V1HcjnPIis9KJ86buF6OQb7HyQ7DLxKR0skiyy92X5aUhnsFl8AroA7owS0jZXIy5BdAezFfCz5PqVb0995ZX4fqgI6GuZLSIVmjyGcTnQr72LaVzQXgTuC2TJ0vCt+RWfzeq7S3rNyXldcx44YbRuPgCyjWsKe2w4T2Cpo9qxXKwTIo9LQVplubzWgXg/VMv4RZA22gLLYz4Z91oD471hMTgUak8uWQqdX+rpYWF0/9Ozc3p9Nnvx0W7Ql1PeZAthWiKfu7/wFXEGoSMPuwVgAAAABJRU5ErkJggg==);*/
    }
    .leaflet-control-droneViewExport-tooltip {
      background-color: rgba(255, 255, 255, 0.6);
      display: none;
      height: 24px;
      left: 30px;
      line-height: 24px;
      margin-left: 15px;
      margin-top: -12px;
      padding: 0 10px;
      position: absolute;
      top: 50%;
      white-space: nowrap;
      width: auto;
    }
    .leaflet-control-droneViewExport a.active .leaflet-control-droneViewExport-tooltip {
      display: block;
    }
    .leaflet-control-droneViewExport-tooltip:before {
      border-color: transparent rgba(255, 255, 255, 0.6);
      border-style: solid;
      border-width: 12px 12px 12px 0;
      content: "";
      display: block;
      height: 0;
      left: -12px;
      position: absolute;
      width: 0;
    }
  `).appendTo('head');
    let parent = $(".leaflet-top.leaflet-left", window.map.getContainer());

    let button = document.createElement("a");
    button.className = "leaflet-bar-part";
    button.addEventListener("click", this.toggleViewExport.bind(this), false);
    button.title = 'Check drone view against predicted';

    let tooltip = document.createElement("div").appendChild(document.createTextNode("V"));
    tooltip.className = "leaflet-control-droneViewExport-tooltip";
    button.appendChild(tooltip);

    let container = document.createElement("div");
    container.className = "leaflet-control-droneViewExport leaflet-bar leaflet-control";
    container.appendChild(button);
    parent.append(container);

    this.button = button;
    this.tooltip = tooltip;
    this.container = container;

  },

  loadView: function() {
    if (typeof L.FileListLoader != 'undefined') {
      L.FileListLoader.loadFiles({accept: 'application/json'})
        .on('load', e => {
          const data = JSON.parse(e.reader.result);
          let cells = data.cells;

          this.active = true;

          this.layer = new L.FeatureGroup();
          this.layer.addTo(map);

          this.droneViewActive = map.hasLayer(window.plugin.dh_view.layer);
          if (this.droneViewActive) map.removeLayer(window.plugin.dh_view.layer);

          this.exportData = data;

          this.selectedCells = [];

          let foundPortals = 0;

          cells.forEach(cell => {
            c = dh_S2.S2Cell.FromFaceIJ(cell.face,cell.ij,cell.level);
            c.loadedPortals = cell.portals;
            c.portals = this.countPortals(c);
            if (c.loadedPortals < 0)
              c.portals = -c.portals;
            else
              foundPortals += c.portals;
            this.selectedCells.push(c);
          })

          this.drawCells();

          if (foundPortals != data.portalCount) alert("Found: " + foundPortals + ". Loaded: " + data.portalCount);

        });
    }

  },

  toggleViewExport: function() {
    if (!this.enabled) return;
    if (this.active) {
      this.active = false;
      this.endViewExport();
    } else {
      this.active = true;
      this.startViewExport();
    }
  },

  startViewExport: function() {
    this.exportData = {};
    let guid = window.selectedPortal;
    if (guid === null || guid === undefined) {
      this.active = false;
      return;
    }

    this.layer = new L.FeatureGroup();
    this.layer.addTo(map);

    this.droneViewActive = map.hasLayer(window.plugin.dh_view.layer);
    if (this.droneViewActive) map.removeLayer(window.plugin.dh_view.layer);

    this.exportData.portalPos = portals[guid]._latlng;
    this.exportData.visParams = this.visParams;

    this.selectedCells = window.plugin.droneHelper.findCellsCoveringCircle(portals[guid]._latlng, this.visParams.radius, this.visParams.cellSize, this.visParams.type);

    for (let cell of this.selectedCells) {
      cell.portals = this.countPortals(cell);
    }

    this.drawCells();

    map.on('mouseup', this.toggleCell, this);

  },

  drawCells: function() {
    this.layer.clearLayers();

    this.selectedCells.forEach(cell => {
      let corners = cell.getCornerLatLngs();
      let drawOptions = {...this.cells.drawOptions};
      if (cell.portals >= 0) {
        if (cell.loadedPortals && this.countPortals(cell) != cell.loadedPortals) {
          drawOptions.color = '#880000';
          drawOptions.fillColor = '#aa0000';
        }
        L.polygon(corners, drawOptions).addTo(this.layer);
      }
      if (cell.loadedPortals < 0 && cell.portals == 0) {
        //if (cell.portals < 0 && cell.loadedPortals && cell.portals != cell.loadedPortals) {
        let drawOptions = {...this.cells.drawOptions};
        drawOptions.color = '#ffff00';
        drawOptions.fillColor = '#ffff66';
        L.polygon(corners, drawOptions).addTo(this.layer);
      }
    })

    for (guid in portals) {
      let testCell = new dh_S2.S2Cell.FromLatLng(portals[guid]._latlng, this.visParams.cellSize);
      for (let cell of this.selectedCells) {
        if (cell.equals(testCell) && cell.portals > 0) {
          const scale = portalMarkerScale();
          //	 portal level		 0	1  2  3  4	5  6  7  8
          const LEVEL_TO_WEIGHT = [2, 2, 2, 2, 2, 3, 3, 4, 4];
          const LEVEL_TO_RADIUS = [7, 7, 7, 7, 8, 8, 9,10,11];
          const level = Math.floor(portals[guid]["options"]["level"]||0);
          const colour = portals[guid]["options"].color
          const lvlWeight = LEVEL_TO_WEIGHT[level] * Math.sqrt(scale) + 1;
          const lvlRadius = LEVEL_TO_RADIUS[level] * scale + 3;
          this.layer.addLayer(L.circleMarker(portals[guid]._latlng, { radius: lvlRadius, fill: true, color: colour, weight: lvlWeight, interactive: false, clickable: false }));

        }
      }
    }

    window.Render.prototype.bringPortalsToFront();

  },

  toggleCell: function(e) {
    let centre = map.containerPointToLatLng([e.originalEvent.clientX, e.originalEvent.clientY]);

    let newCell = new dh_S2.S2Cell.FromLatLng(centre, this.visParams.cellSize);
    let neighbours = newCell.getNeighbors();

    let found = false;
    let neighbour = false;
    let oldCell = null
    for (let i = 0; i < this.selectedCells.length; i++) {
      if (this.selectedCells[i].equals(newCell)) {
        found = true;
        this.selectedCells[i].portals = -this.selectedCells[i].portals;
        break;
      } else if (neighbour === false) {
        neighbours.forEach(cell => {
          if (this.selectedCells[i].equals(cell))
            neighbour = true;
        })
      }
    }

    if (!found && neighbour) {
      this.selectedCells.push(newCell);
      newCell.portals = this.countPortals(newCell);
    }

    this.drawCells();
  },

  endViewExport: function() {
    if (this.droneViewActive) map.addLayer(window.plugin.dh_view.layer);
    map.removeLayer(this.layer);
    map.off('click', this.toggleCell, this);

    let portalCount = 0;

    for (let cell of this.selectedCells) {
      if (cell.portals > 0)
        portalCount += cell.portals;
      delete cell.loadedPortals;
    }

    this.exportData.portalCount = portalCount;
    this.exportData.cells = this.selectedCells;

    this.saveJSON();

  },

  countPortals: function(cell) {
    portalCount = 0;
    for (guid in portals) {
      let testCell = new dh_S2.S2Cell.FromLatLng(portals[guid]._latlng, this.visParams.cellSize);
      if (cell.equals(testCell)) {
        portalCount++;
      }
    }
    return portalCount;
  },

  saveJSON: function() {
    if (!confirm('Save record of drone view?'))
      return;
    const fileName = '' + this.exportData.portalPos.lat + ',' + this.exportData.portalPos.lng + '.json';
    const json = JSON.stringify(this.exportData);
    if (typeof window.saveFile != 'undefined') {
      window.saveFile(json, fileName, 'application/json');
    } else {
      alert('cannot export route - browser compatibility issue');
    }
  },
}

var setup = function() {
  window.plugin.droneviewexport.setup();

}

//PLUGIN END //////////////////////////////////////////////////////////

setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
  if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

