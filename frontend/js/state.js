/**
 * Estado global de la aplicación y utilidades de coordenadas CAD / GIS (WGS84).
 */
let appState = {
  projectName: 'Red FTTH Sector Norte — Troncal GPON',
  scaleMetersPerGrid: 50,
  gridSizePx: 50,
  mapMode: 'cad',
  gisOrigin: { lat: -8.111600, lng: -79.028700 },
  viewport: { x: 80, y: 60, zoom: 1.0 },
  activeTool: 'select',
  selectedItem: null,
  nodes: [],
  cables: [],
  drawingCable: null,
  splicingNodeId: null,
  pendingSpliceSource: null
};

function cadToMeters(px) {
  return (px / appState.gridSizePx) * appState.scaleMetersPerGrid;
}

function cadToLatLng(x, y) {
  const metersX = cadToMeters(x);
  const metersY = cadToMeters(y);
  const lat = appState.gisOrigin.lat - (metersY / 111320);
  const lng = appState.gisOrigin.lng + (metersX / (111320 * Math.cos(appState.gisOrigin.lat * Math.PI / 180)));
  return { lat: lat.toFixed(6), lng: lng.toFixed(6) };
}

function getFiberColor(fiberIndex1Based) {
  const idx = (fiberIndex1Based - 1) % 12;
  const tube = Math.floor((fiberIndex1Based - 1) / 12) + 1;
  return { ...TIA_598_COLORS[idx], tube };
}

function generateId(prefix) {
  return `${prefix}_${Math.random().toString(36).substr(2, 6)}`;
}
