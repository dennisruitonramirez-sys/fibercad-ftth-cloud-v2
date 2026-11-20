/**
 * Renderizado vectorial SVG del plano CAD/GIS, cables, reservas y nodos.
 */
function renderCanvas(opticalMap) {
  const vp = document.getElementById('viewport-group');
  vp.setAttribute('transform', `translate(${appState.viewport.x}, ${appState.viewport.y}) scale(${appState.viewport.zoom})`);
  document.getElementById('zoom-level-label').textContent = `${Math.round(appState.viewport.zoom * 100)}%`;

  renderGISBackdrop();

  const cablesLayer = document.getElementById('cables-layer');
  const reservesLayer = document.getElementById('reserves-layer');
  const nodesLayer = document.getElementById('nodes-layer');

  cablesLayer.innerHTML = appState.cables.map(cable => {
    const pts = getCablePoints(cable);
    if (pts.length < 2) return '';

    const isSelected = appState.selectedItem?.kind === 'cable' && appState.selectedItem?.id === cable.id;
    const routeM = calculateCableRouteMeters(cable);
    const totalM = routeM + Number(cable.reserveMeters || 0);

    let strokeColor = '#38bdf8';
    let strokeWidth = 3.5;
    let dashArray = '';

    if (cable.type === 'troncal') {
      strokeColor = '#a855f7';
      strokeWidth = 5;
    } else if (cable.type === 'drop') {
      strokeColor = '#10b981';
      strokeWidth = 2.2;
      dashArray = '6,4';
    }

    const pathD = buildSmoothOrPolylinePath(pts);
    const midPt = getPolylineMidpoint(pts);

    const handlesHtml = isSelected ? (cable.waypoints || []).map((wp, idx) => `
      <circle cx="${wp.x}" cy="${wp.y}" r="6" fill="#f59e0b" stroke="#090d16" stroke-width="2"
              class="cursor-move waypoint-handle" data-cable-id="${cable.id}" data-wp-idx="${idx}" />
    `).join('') : '';

    return `
      <g class="cable-group cursor-pointer" onclick="selectItem(event, 'cable', '${cable.id}')">
        <path d="${pathD}" fill="none" stroke="transparent" stroke-width="16" />
        ${isSelected ? `<path d="${pathD}" fill="none" stroke="#f59e0b" stroke-width="${strokeWidth + 5}" stroke-opacity="0.35" stroke-linecap="round" />` : ''}
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${dashArray}" stroke-linecap="round" stroke-linejoin="round" />
        <path d="${pathD}" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.45" stroke-dasharray="4,20" class="fiber-flow" />

        <g transform="translate(${midPt.x}, ${midPt.y})">
          <rect x="-46" y="-12" width="92" height="22" rx="6" fill="#0f172a" stroke="${isSelected ? '#f59e0b' : strokeColor}" stroke-width="1.2" />
          <text x="0" y="-1" text-anchor="middle" fill="#f8fafc" font-size="9.5" font-family="JetBrains Mono" font-weight="600">
            ${cable.cores}H &bull; ${totalM}m
          </text>
          <text x="0" y="8" text-anchor="middle" fill="#94a3b8" font-size="7.5" font-family="Inter">
            (${routeM}m + ${cable.reserveMeters || 0}m res)
          </text>
        </g>
        ${handlesHtml}
      </g>
    `;
  }).join('');

  let reservesHtml = '';
  nodesLayer.innerHTML = appState.nodes.map(node => {
    const isSelected = appState.selectedItem?.kind === 'node' && appState.selectedItem?.id === node.id;
    const spec = NODE_CATALOG[node.type] || NODE_CATALOG.POSTE;
    const opt = opticalMap[node.id];
    const sig = getSignalStatusBadge(opt?.rxPower);

    if (node.reserveMeters && Number(node.reserveMeters) > 0) {
      reservesHtml += `
        <g transform="translate(${node.x + 22}, ${node.y - 22})" title="Reserva técnica: ${node.reserveMeters}m">
          <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3,2" />
          <text x="0" y="3" text-anchor="middle" fill="#fbbf24" font-size="8" font-family="JetBrains Mono" font-weight="bold">${node.reserveMeters}m</text>
        </g>
      `;
    }

    const isSpliceable = ['OLT', 'ODF', 'MUFA', 'NAP', 'SPLITTER'].includes(node.type);

    return `
      <g class="node-group cursor-pointer"
         transform="translate(${node.x}, ${node.y})"
         onmousedown="startNodeDrag(event, '${node.id}')"
         onclick="handleNodeClick(event, '${node.id}')"
         ondblclick="handleNodeDoubleClick(event, '${node.id}')">

        ${isSelected ? `<circle cx="0" cy="0" r="28" fill="none" stroke="#38bdf8" stroke-width="2" class="selection-ring" />` : ''}
        ${isSelected ? `<circle cx="0" cy="0" r="24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,3" />` : ''}

        <rect x="-20" y="-20" width="40" height="40" rx="11" fill="#0f172a" stroke="${isSelected ? '#38bdf8' : spec.color}" stroke-width="${isSelected ? 2.5 : 2}" />
        <rect x="-16" y="-16" width="32" height="32" rx="8" fill="${spec.color}" fill-opacity="0.18" />

        <text x="0" y="5" text-anchor="middle" fill="${spec.color}" font-family="Font Awesome 6 Free" font-weight="900" font-size="15">
          ${spec.icon}
        </text>

        ${isSpliceable && (node.splices?.length || 0) > 0 ? `
          <g transform="translate(-20, -20)">
            <circle cx="0" cy="0" r="8" fill="#10b981" stroke="#090d16" stroke-width="1.5" />
            <text x="0" y="3" text-anchor="middle" fill="#090d16" font-size="8.5" font-family="JetBrains Mono" font-weight="bold">${node.splices.length}</text>
          </g>
        ` : ''}

        <g transform="translate(0, 32)">
          <rect x="-54" y="-9" width="108" height="${opt ? 26 : 16}" rx="5" fill="#0f172a" fill-opacity="0.92" stroke="#1e293b" stroke-width="1" />
          <text x="0" y="1" text-anchor="middle" fill="#f1f5f9" font-size="9.5" font-family="Inter" font-weight="600">${node.name}</text>
          ${opt ? `
            <text x="0" y="12" text-anchor="middle" fill="${sig.color}" font-size="8.5" font-family="JetBrains Mono" font-weight="600">
              ${node.type === 'OLT' ? `TX: +${opt.rxPower} dBm` : `${opt.rxPower} dBm`}
            </text>
          ` : ''}
        </g>
      </g>
    `;
  }).join('');

  reservesLayer.innerHTML = reservesHtml;
}

function buildSmoothOrPolylinePath(pts) {
  if (pts.length === 2) {
    return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const v1x = prev.x - curr.x, v1y = prev.y - curr.y;
    const v2x = next.x - curr.x, v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    const r = Math.min(18, len1 * 0.35, len2 * 0.35);

    const p1x = curr.x + (v1x / len1) * r;
    const p1y = curr.y + (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;

    d += ` L ${p1x} ${p1y} Q ${curr.x} ${curr.y} ${p2x} ${p2y}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function getPolylineMidpoint(pts) {
  let totalLen = 0;
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segs.push({ p1: pts[i], p2: pts[i + 1], len: l });
    totalLen += l;
  }
  let half = totalLen / 2;
  for (const s of segs) {
    if (half <= s.len && s.len > 0) {
      const t = half / s.len;
      return {
        x: s.p1.x + (s.p2.x - s.p1.x) * t,
        y: s.p1.y + (s.p2.y - s.p1.y) * t
      };
    }
    half -= s.len;
  }
  return pts[0];
}

function renderGISBackdrop() {
  const svg = document.getElementById('gis-backdrop-svg');
  if (appState.mapMode !== 'gis') {
    svg.classList.add('hidden');
    return;
  }
  svg.classList.remove('hidden');
  svg.innerHTML = `
    <g stroke="#334155" stroke-width="18" fill="none">
      <line x1="0" y1="280" x2="1600" y2="280" />
      <line x1="690" y1="0" x2="690" y2="900" />
      <line x1="0" y1="150" x2="1600" y2="150" stroke-width="10" />
      <line x1="0" y1="410" x2="1600" y2="410" stroke-width="10" />
      <line x1="450" y1="0" x2="450" y2="900" stroke-width="10" />
      <line x1="920" y1="0" x2="920" y2="900" stroke-width="10" />
    </g>
    <g fill="#475569" font-family="Inter" font-size="11" font-weight="600">
      <text x="140" y="274">AV. TRONCAL PRINCIPAL (EJE GPON)</text>
      <text x="698" y="90" transform="rotate(90 698,90)">JR. DISTRIBUCIÓN NORTE-SUR</text>
      <text x="730" y="145">CALLE LOS PINOS</text>
      <text x="730" y="405">CALLE LAS PALMERAS</text>
    </g>
  `;
}
