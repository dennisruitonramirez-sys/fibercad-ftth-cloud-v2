/**
 * Motor óptico: cálculo de longitudes de ruta + reservas, trazado de señal
 * desde OLT a través de fusiones/splitters y evaluación de presupuesto óptico.
 */
function getCablePoints(cable) {
  const fromNode = appState.nodes.find(n => n.id === cable.fromNodeId);
  const toNode = appState.nodes.find(n => n.id === cable.toNodeId);
  if (!fromNode || !toNode) return [];
  return [
    { x: fromNode.x, y: fromNode.y },
    ...(cable.waypoints || []),
    { x: toNode.x, y: toNode.y }
  ];
}

function calculateCableRouteMeters(cable) {
  const pts = getCablePoints(cable);
  let pxDist = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    pxDist += Math.hypot(dx, dy);
  }
  return Math.round(cadToMeters(pxDist));
}

function endpointsMatch(a, b) {
  if (!a || !b || a.kind !== b.kind) return false;
  if (a.kind === 'cable') return a.cableId === b.cableId && Number(a.fiber) === Number(b.fiber);
  if (a.kind === 'oltPort') return Number(a.port) === Number(b.port);
  if (a.kind === 'splitterIn') return Number(a.port) === Number(b.port);
  if (a.kind === 'splitterOut') return Number(a.port) === Number(b.port);
  return false;
}

function computeOpticalNetwork() {
  const wavelength = document.getElementById('wavelength-select')?.value || '1490';
  const dbPerKm = FIBER_ATTENUATION_DB_KM[wavelength] || 0.25;

  const nodeOpticalResults = {};
  appState.nodes.forEach(n => {
    nodeOpticalResults[n.id] = null;
  });

  function traceSignal(currentNodeId, incomingEndpoint, currentPowerDbm, accDistM, accLossDb, splitChain, splicesCount, connectorsCount, visitedSet) {
    const node = appState.nodes.find(n => n.id === currentNodeId);
    if (!node) return;

    const visitKey = `${currentNodeId}_${JSON.stringify(incomingEndpoint)}`;
    if (visitedSet.has(visitKey)) return;
    visitedSet.add(visitKey);

    if (!nodeOpticalResults[node.id] || currentPowerDbm > nodeOpticalResults[node.id].rxPower) {
      nodeOpticalResults[node.id] = {
        rxPower: Number(currentPowerDbm.toFixed(2)),
        totalLoss: Number(accLossDb.toFixed(2)),
        totalDistMeters: Math.round(accDistM),
        splitChain: [...splitChain],
        splicesCount,
        connectorsCount
      };
    }

    if (node.type === 'ONT') return;

    const splices = node.splices || [];
    const matchingSplices = splices.filter(sp => endpointsMatch(sp.from, incomingEndpoint));

    for (const sp of matchingSplices) {
      const target = sp.to;

      if (target.kind === 'splitterIn') {
        const ratio = node.splitter || 'none';
        const spec = SPLITTER_SPECS[ratio] || SPLITTER_SPECS['none'];
        if (spec.ports > 0) {
          const outSplices = splices.filter(s => s.from.kind === 'splitterOut');
          for (const osp of outSplices) {
            let splitLoss = spec.loss;
            if (spec.unbalanced) {
              splitLoss = (osp.from.port === 1) ? spec.lossTap : spec.lossPass;
            }
            const connLoss = (node.type === 'NAP') ? CONNECTOR_LOSS_DB : SPLICE_LOSS_DB;
            const newPower = currentPowerDbm - splitLoss - connLoss;
            const newChain = [...splitChain, ratio];
            const newSpl = node.type === 'NAP' ? splicesCount : splicesCount + 1;
            const newCon = node.type === 'NAP' ? connectorsCount + 1 : connectorsCount;

            propagateThroughTarget(node, osp.to, newPower, accDistM, accLossDb + splitLoss + connLoss, newChain, newSpl, newCon, new Set(visitedSet));
          }
        }
      } else {
        const jointLoss = (node.type === 'ODF' || node.type === 'OLT') ? CONNECTOR_LOSS_DB : SPLICE_LOSS_DB;
        const newSpl = (node.type === 'ODF' || node.type === 'OLT') ? splicesCount : splicesCount + 1;
        const newCon = (node.type === 'ODF' || node.type === 'OLT') ? connectorsCount + 1 : connectorsCount;

        propagateThroughTarget(node, target, currentPowerDbm - jointLoss, accDistM, accLossDb + jointLoss, splitChain, newSpl, newCon, new Set(visitedSet));
      }
    }
  }

  function propagateThroughTarget(currentNode, target, powerDbm, distM, lossDb, splitChain, splicesCount, connectorsCount, visitedSet) {
    if (target.kind === 'cable') {
      const cable = appState.cables.find(c => c.id === target.cableId);
      if (!cable) return;

      const nextNodeId = (cable.fromNodeId === currentNode.id) ? cable.toNodeId : cable.fromNodeId;
      const nextNode = appState.nodes.find(n => n.id === nextNodeId);
      if (!nextNode) return;

      const routeMeters = calculateCableRouteMeters(cable);
      const cableReserve = Number(cable.reserveMeters || 0);
      const nodeReserve = Number(nextNode.reserveMeters || 0);
      const segmentDistM = routeMeters + cableReserve + nodeReserve;
      const fiberLoss = (segmentDistM / 1000) * dbPerKm;

      const arrivalPower = powerDbm - fiberLoss;
      const totalLoss = lossDb + fiberLoss;
      const totalDist = distM + segmentDistM;

      if (nextNode.type === 'ONT') {
        const finalLoss = CONNECTOR_LOSS_DB;
        nodeOpticalResults[nextNode.id] = {
          rxPower: Number((arrivalPower - finalLoss).toFixed(2)),
          totalLoss: Number((totalLoss + finalLoss).toFixed(2)),
          totalDistMeters: Math.round(totalDist),
          splitChain: [...splitChain],
          splicesCount,
          connectorsCount: connectorsCount + 1
        };
      } else {
        traceSignal(
          nextNode.id,
          { kind: 'cable', cableId: cable.id, fiber: target.fiber },
          arrivalPower,
          totalDist,
          totalLoss,
          splitChain,
          splicesCount,
          connectorsCount,
          visitedSet
        );
      }
    }
  }

  const olts = appState.nodes.filter(n => n.type === 'OLT');
  for (const olt of olts) {
    const txPower = Number(olt.txPower ?? 5.0);
    nodeOpticalResults[olt.id] = {
      rxPower: txPower,
      totalLoss: 0,
      totalDistMeters: 0,
      splitChain: [],
      splicesCount: 0,
      connectorsCount: 0
    };

    const portSplices = (olt.splices || []).filter(s => s.from.kind === 'oltPort');
    for (const sp of portSplices) {
      propagateThroughTarget(olt, sp.to, txPower - CONNECTOR_LOSS_DB, Number(olt.reserveMeters || 0), CONNECTOR_LOSS_DB, [], 0, 1, new Set());
    }
  }

  return nodeOpticalResults;
}

function getSignalStatusBadge(rxPower) {
  if (rxPower === null || rxPower === undefined) {
    return { status: 'Sin Enlace', color: '#64748b', bg: 'bg-slate-800 text-slate-400 border-slate-700' };
  }
  if (rxPower >= -24.0 && rxPower <= -8.0) {
    return { status: 'Óptimo', color: '#10b981', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' };
  }
  if (rxPower >= -27.0 && rxPower < -24.0) {
    return { status: 'Margen Ajustado', color: '#f59e0b', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/40' };
  }
  return { status: 'Fuera de Rango', color: '#ef4444', bg: 'bg-red-500/15 text-red-300 border-red-500/40' };
}

function recalculateNetwork() {
  renderAll();
}
