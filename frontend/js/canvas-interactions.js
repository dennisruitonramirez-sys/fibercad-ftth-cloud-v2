/**
 * Interacciones de usuario sobre el lienzo: paneo, zoom, arrastre de nodos/vértices,
 * trazado de cables y drag-and-drop desde la paleta.
 */
let isPanning = false;
let panStart = { x: 0, y: 0 };
let draggingNodeId = null;
let draggingWaypoint = null;

function setupCanvasEvents() {
  const svg = document.getElementById('network-svg');

  svg.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('waypoint-handle')) {
      e.stopPropagation();
      draggingWaypoint = {
        cableId: e.target.getAttribute('data-cable-id'),
        idx: Number(e.target.getAttribute('data-wp-idx'))
      };
      return;
    }

    const pt = screenToWorld(e.clientX, e.clientY);

    if (appState.activeTool === 'pan' || e.button === 1) {
      isPanning = true;
      panStart = { x: e.clientX - appState.viewport.x, y: e.clientY - appState.viewport.y };
      svg.style.cursor = 'grabbing';
      return;
    }

    if (appState.activeTool === 'cable' && appState.drawingCable) {
      appState.drawingCable.points.push({ x: Math.round(pt.x), y: Math.round(pt.y) });
      renderDraftCable(pt);
      return;
    }

    if (e.target === svg || e.target.id === 'grid-layer') {
      appState.selectedItem = null;
      renderAll();
    }
  });

  window.addEventListener('mousemove', (e) => {
    const pt = screenToWorld(e.clientX, e.clientY);
    const mx = Math.round(cadToMeters(pt.x));
    const my = Math.round(cadToMeters(pt.y));
    const gis = cadToLatLng(pt.x, pt.y);

    document.getElementById('cursor-cad-coords').textContent = `CAD: X: ${mx}m, Y: ${my}m`;
    document.getElementById('cursor-gis-coords').textContent = `GIS (WGS84): ${gis.lat}, ${gis.lng}`;

    if (isPanning) {
      appState.viewport.x = e.clientX - panStart.x;
      appState.viewport.y = e.clientY - panStart.y;
      const vp = document.getElementById('viewport-group');
      vp.setAttribute('transform', `translate(${appState.viewport.x}, ${appState.viewport.y}) scale(${appState.viewport.zoom})`);
      return;
    }

    if (draggingNodeId) {
      const node = appState.nodes.find(n => n.id === draggingNodeId);
      if (node) {
        node.x = Math.round(pt.x / 5) * 5;
        node.y = Math.round(pt.y / 5) * 5;
        renderAll();
      }
      return;
    }

    if (draggingWaypoint) {
      const cable = appState.cables.find(c => c.id === draggingWaypoint.cableId);
      if (cable && cable.waypoints[draggingWaypoint.idx]) {
        cable.waypoints[draggingWaypoint.idx] = {
          x: Math.round(pt.x / 5) * 5,
          y: Math.round(pt.y / 5) * 5
        };
        renderAll();
      }
      return;
    }

    if (appState.activeTool === 'cable' && appState.drawingCable) {
      renderDraftCable(pt);
    }
  });

  window.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      document.getElementById('network-svg').style.cursor = appState.activeTool === 'pan' ? 'grab' : 'crosshair';
    }
    draggingNodeId = null;
    draggingWaypoint = null;
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomCanvas(factor);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (appState.drawingCable) cancelCableDrawing();
      if (!document.getElementById('splice-modal').classList.contains('hidden')) closeSpliceModal();
    }
  });
}

function screenToWorld(clientX, clientY) {
  const svg = document.getElementById('network-svg');
  const rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left - appState.viewport.x) / appState.viewport.zoom,
    y: (clientY - rect.top - appState.viewport.y) / appState.viewport.zoom
  };
}

function startNodeDrag(e, nodeId) {
  if (appState.activeTool !== 'select') return;
  e.stopPropagation();
  draggingNodeId = nodeId;
  selectItem(e, 'node', nodeId);
}

function handleNodeClick(e, nodeId) {
  e.stopPropagation();

  if (appState.activeTool === 'cable') {
    const clickedNode = appState.nodes.find(n => n.id === nodeId);
    if (!clickedNode) return;

    if (!appState.drawingCable) {
      const type = document.getElementById('new-cable-type').value;
      const cores = Number(document.getElementById('new-cable-cores').value);
      const reserve = Number(document.getElementById('new-cable-reserve').value);

      appState.drawingCable = {
        fromNodeId: nodeId,
        points: [{ x: clickedNode.x, y: clickedNode.y }],
        waypoints: [],
        type,
        cores,
        reserveMeters: reserve
      };
      document.getElementById('drawing-helper-bar').classList.remove('hidden');
      document.getElementById('drawing-helper-text').textContent = `Origen: ${clickedNode.name} — Haz clic en el plano para curvas o en el nodo destino.`;
    } else {
      if (appState.drawingCable.fromNodeId === nodeId) {
        showToast('El nodo destino debe ser diferente al nodo origen', 'warning');
        return;
      }
      const waypoints = appState.drawingCable.points.slice(1);
      const newCable = {
        id: generateId('cab'),
        name: `Fibra ${appState.drawingCable.type.toUpperCase()} ${appState.drawingCable.cores}H`,
        type: appState.drawingCable.type,
        cores: appState.drawingCable.cores,
        fromNodeId: appState.drawingCable.fromNodeId,
        toNodeId: nodeId,
        waypoints,
        reserveMeters: appState.drawingCable.reserveMeters
      };
      appState.cables.push(newCable);
      cancelCableDrawing();
      appState.selectedItem = { kind: 'cable', id: newCable.id };
      renderAll();
      showToast(`Cable de ${newCable.cores} hilos tendido (${calculateCableRouteMeters(newCable)}m + ${newCable.reserveMeters}m reserva)`, 'success');
    }
    return;
  }

  selectItem(e, 'node', nodeId);
}

function handleNodeDoubleClick(e, nodeId) {
  e.stopPropagation();
  const node = appState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  if (['OLT', 'ODF', 'MUFA', 'NAP', 'SPLITTER'].includes(node.type)) {
    openSpliceModal(nodeId);
  }
}

function renderDraftCable(cursorPt) {
  const draftLayer = document.getElementById('draft-layer');
  if (!appState.drawingCable) {
    draftLayer.innerHTML = '';
    return;
  }
  const pts = [...appState.drawingCable.points, cursorPt];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  draftLayer.innerHTML = `
    <path d="${d}" fill="none" stroke="#fbbf24" stroke-width="3" stroke-dasharray="6,4" />
    ${appState.drawingCable.points.slice(1).map(p => `<circle cx="${p.x}" cy="${p.y}" r="4.5" fill="#fbbf24" />`).join('')}
  `;
}

function cancelCableDrawing() {
  appState.drawingCable = null;
  document.getElementById('draft-layer').innerHTML = '';
  document.getElementById('drawing-helper-bar').classList.add('hidden');
}

function selectItem(e, kind, id) {
  if (e) e.stopPropagation();
  appState.selectedItem = { kind, id };
  renderAll();
}

function handleDragStart(e, nodeType) {
  e.dataTransfer.setData('nodeType', nodeType);
}

function handleCanvasDrop(e) {
  e.preventDefault();
  const nodeType = e.dataTransfer.getData('nodeType');
  if (!nodeType) return;
  const pt = screenToWorld(e.clientX, e.clientY);
  createNodeAt(nodeType, Math.round(pt.x), Math.round(pt.y));
}

function quickPlaceNode(nodeType) {
  const svg = document.getElementById('network-svg');
  const rect = svg.getBoundingClientRect();
  const pt = screenToWorld(
    rect.left + rect.width / 2 + (Math.random() * 80 - 40),
    rect.top + rect.height / 2 + (Math.random() * 80 - 40)
  );
  createNodeAt(nodeType, Math.round(pt.x), Math.round(pt.y));
}

function createNodeAt(type, x, y) {
  const count = appState.nodes.filter(n => n.type === type).length + 1;
  const spec = NODE_CATALOG[type];
  const newNode = {
    id: generateId('node'),
    type,
    name: `${spec.label.replace(/\s+/g, '-')}-0${count}`,
    x,
    y,
    reserveMeters: ['MUFA', 'NAP', 'POSTE'].includes(type) ? 15 : 0,
    ports: spec.defaultPorts || 8,
    txPower: spec.txPower || 5.0,
    splitter: type === 'SPLITTER' ? '1:8' : 'none',
    sensitivity: -27.0,
    splices: []
  };
  appState.nodes.push(newNode);
  appState.selectedItem = { kind: 'node', id: newNode.id };
  setTool('select');
  renderAll();
  showToast(`${newNode.name} añadido al plano`, 'success');
}
