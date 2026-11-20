const FIBER_ATTENUATION_DB_KM = {
  '1310': 0.35,
  '1490': 0.25,
  '1550': 0.20
};

const SPLICE_LOSS_DB = 0.08;
const CONNECTOR_LOSS_DB = 0.40;

function computeOpticalBudget({ nodes, cables, wavelength = '1490', scaleMetersPerGrid = 50, gridSizePx = 50 }) {
  const dbPerKm = FIBER_ATTENUATION_DB_KM[wavelength] || 0.25;

  let totalRouteMeters = 0;
  let totalReserveMeters = 0;

  const cableMetrics = cables.map(cab => {
    const fromNode = nodes.find(n => n.id === cab.fromNodeId);
    const toNode = nodes.find(n => n.id === cab.toNodeId);
    const pts = [
      ...(fromNode ? [{ x: fromNode.x, y: fromNode.y }] : []),
      ...(cab.waypoints || []),
      ...(toNode ? [{ x: toNode.x, y: toNode.y }] : [])
    ];
    let pxDist = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      pxDist += Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    }
    const routeMeters = Math.round((pxDist / gridSizePx) * scaleMetersPerGrid);
    const reserveMeters = Number(cab.reserveMeters || 0);
    totalRouteMeters += routeMeters;
    totalReserveMeters += reserveMeters;

    return {
      id: cab.id,
      name: cab.name,
      cores: cab.cores,
      routeMeters,
      reserveMeters,
      totalWithMarginMeters: Math.ceil((routeMeters + reserveMeters) * 1.05)
    };
  });

  const nodeReserves = nodes.reduce((acc, n) => acc + Number(n.reserveMeters || 0), 0);
  totalReserveMeters += nodeReserves;

  return {
    wavelength,
    dbPerKm,
    spliceLossDb: SPLICE_LOSS_DB,
    connectorLossDb: CONNECTOR_LOSS_DB,
    totalRouteMeters,
    totalReserveMeters,
    totalFiberMeters: totalRouteMeters + totalReserveMeters,
    cables: cableMetrics
  };
}

module.exports = { computeOpticalBudget };
