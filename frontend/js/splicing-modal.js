/**
 * Modal interactivo de fusiones, bandejas y splitters internos por nodo.
 */
function openSpliceModal(nodeId) {
  const node = appState.nodes.find(n => n.id === nodeId);
  if (!node) return;

  appState.splicingNodeId = nodeId;
  appState.pendingSpliceSource = null;

  document.getElementById('splice-modal-title').textContent = `Gestor de Fusiones y Bandejas — ${node.name}`;
  document.getElementById('splice-modal-type').textContent = node.type;
  document.getElementById('splice-selection-status').textContent = 'Listo: Haz clic en un hilo de origen (izquierda/splitter) y luego en un hilo destino (derecha/splitter).';

  renderSpliceModalContent();
  document.getElementById('splice-modal').classList.remove('hidden');
  setTimeout(drawSpliceSvgCurves, 50);
}

function closeSpliceModal() {
  document.getElementById('splice-modal').classList.add('hidden');
  appState.splicingNodeId = null;
  appState.pendingSpliceSource = null;
  renderAll();
}

function renderSpliceModalContent() {
  const node = appState.nodes.find(n => n.id === appState.splicingNodeId);
  if (!node) return;

  const connectedCables = appState.cables.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);
  const incomingCables = connectedCables.filter(c => c.toNodeId === node.id);
  const outgoingCables = connectedCables.filter(c => c.fromNodeId === node.id);

  const splices = node.splices || [];

  const isEndpointSpliced = (ep) => splices.some(s => endpointsMatch(s.from, ep) || endpointsMatch(s.to, ep));
  const isPendingSource = (ep) => appState.pendingSpliceSource && endpointsMatch(appState.pendingSpliceSource, ep);

  let leftHtml = '';
  let leftFiberCount = 0;

  if (node.type === 'OLT') {
    const ports = Number(node.ports || 8);
    leftFiberCount += ports;
    leftHtml += `
      <div class="bg-slate-950 border border-indigo-500/30 rounded-xl p-2.5">
        <div class="text-[11px] font-bold text-indigo-300 mb-2 flex items-center justify-between">
          <span><i class="fa-solid fa-server mr-1"></i>Puertos SFP PON (+${node.txPower} dBm)</span>
          <span class="font-mono text-[10px]">${ports}P</span>
        </div>
        <div class="space-y-1">
          ${Array.from({ length: ports }, (_, i) => {
            const portNum = i + 1;
            const ep = { kind: 'oltPort', port: portNum };
            const active = isEndpointSpliced(ep);
            const selected = isPendingSource(ep);
            return `
              <div data-ep='${JSON.stringify(ep)}'
                   onclick='handleSpliceEndpointClick(${JSON.stringify(ep)})'
                   class="splice-pin flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition border ${selected ? 'bg-cyan-500/25 border-cyan-400 text-white' : active ? 'bg-slate-900 border-emerald-500/40 text-emerald-300' : 'bg-slate-900/70 border-slate-800 hover:border-slate-600 text-slate-300'}">
                <span class="font-mono font-semibold">PON 0/${portNum}</span>
                <span class="w-2.5 h-2.5 rounded-full ${active ? 'bg-emerald-400 shadow shadow-emerald-400' : 'bg-slate-600'}"></span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  incomingCables.forEach(cab => {
    const displayCores = Math.min(cab.cores, 24);
    leftFiberCount += cab.cores;
    leftHtml += renderCableFiberBlock(cab, displayCores, isEndpointSpliced, isPendingSource);
  });

  if (!leftHtml) {
    leftHtml = `<div class="text-xs text-slate-500 text-center p-6">No hay cables entrantes conectados a este nodo.</div>`;
  }
  document.getElementById('splice-left-list').innerHTML = leftHtml;
  document.getElementById('splice-in-count').textContent = `${leftFiberCount} hilos`;

  let rightHtml = '';
  let rightFiberCount = 0;

  outgoingCables.forEach(cab => {
    const displayCores = Math.min(cab.cores, 24);
    rightFiberCount += cab.cores;
    rightHtml += renderCableFiberBlock(cab, displayCores, isEndpointSpliced, isPendingSource);
  });

  if (!rightHtml) {
    rightHtml = `<div class="text-xs text-slate-500 text-center p-6">No hay cables salientes conectados a este nodo.</div>`;
  }
  document.getElementById('splice-right-list').innerHTML = rightHtml;
  document.getElementById('splice-out-count').textContent = `${rightFiberCount} hilos`;

  const splitterPanel = document.getElementById('internal-splitter-panel');
  if (['MUFA', 'NAP', 'SPLITTER', 'ODF'].includes(node.type)) {
    const ratio = node.splitter || 'none';
    const spec = SPLITTER_SPECS[ratio] || SPLITTER_SPECS['none'];

    let portsGrid = '';
    if (spec.ports > 0) {
      const inEp = { kind: 'splitterIn', port: 1 };
      const inActive = isEndpointSpliced(inEp);
      const inSel = isPendingSource(inEp);

      portsGrid = `
        <div class="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
          <div data-ep='${JSON.stringify(inEp)}'
               onclick='handleSpliceEndpointClick(${JSON.stringify(inEp)})'
               class="splice-pin px-3 py-2 rounded-lg border cursor-pointer text-xs font-mono flex items-center gap-2 transition ${inSel ? 'bg-cyan-500/25 border-cyan-400 text-white' : inActive ? 'bg-amber-500/20 border-amber-400 text-amber-200' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-amber-400'}">
            <span class="w-2.5 h-2.5 rounded-full ${inActive ? 'bg-amber-400' : 'bg-slate-600'}"></span>
            <span>IN (1)</span>
          </div>

          <i class="fa-solid fa-arrow-right text-slate-600"></i>

          <div class="flex-1 grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto">
            ${Array.from({ length: spec.ports }, (_, idx) => {
              const p = idx + 1;
              const outEp = { kind: 'splitterOut', port: p };
              const outActive = isEndpointSpliced(outEp);
              const outSel = isPendingSource(outEp);
              const label = spec.unbalanced ? (p === 1 ? 'TAP' : 'PASS') : `P${p}`;
              return `
                <div data-ep='${JSON.stringify(outEp)}'
                     onclick='handleSpliceEndpointClick(${JSON.stringify(outEp)})'
                     class="splice-pin px-2 py-1 rounded border text-[10px] font-mono text-center cursor-pointer transition ${outSel ? 'bg-cyan-500/25 border-cyan-400 text-white' : outActive ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-emerald-400'}">
                  ${label}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    splitterPanel.classList.remove('hidden');
    splitterPanel.innerHTML = `
      <div class="flex items-center justify-between gap-2">
        <span class="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <i class="fa-solid fa-code-branch"></i> Splitter Óptico Interno
        </span>
        <select onchange="changeNodeSplitterInModal('${node.id}', this.value)" class="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono">
          ${Object.entries(SPLITTER_SPECS).map(([k, v]) => `<option value="${k}" ${ratio === k ? 'selected' : ''}>${v.label}</option>`).join('')}
        </select>
      </div>
      ${portsGrid}
    `;
  } else {
    splitterPanel.classList.add('hidden');
  }

  document.getElementById('active-tray-count').textContent = splices.length;
  const trayList = document.getElementById('splice-tray-list');
  if (splices.length === 0) {
    trayList.innerHTML = `<div class="text-[11px] text-slate-500 text-center py-3">Sin fusiones registradas en esta bandeja.</div>`;
  } else {
    trayList.innerHTML = splices.map(sp => `
      <div class="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[11px] font-mono">
        <span class="text-cyan-300 truncate max-w-[42%]">${formatEndpointLabel(sp.from)}</span>
        <i class="fa-solid fa-fire-flame-curved text-amber-400 text-[10px]"></i>
        <span class="text-emerald-300 truncate max-w-[42%]">${formatEndpointLabel(sp.to)}</span>
        <button onclick="removeSplice('${sp.id}')" class="text-slate-500 hover:text-red-400 ml-1" title="Eliminar fusión">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join('');
  }
}

function renderCableFiberBlock(cable, displayCores, isEndpointSpliced, isPendingSource) {
  return `
    <div class="bg-slate-950 border border-slate-800 rounded-xl p-2.5">
      <div class="text-[11px] font-bold text-slate-200 mb-2 flex items-center justify-between">
        <span class="truncate" title="${cable.name}">${cable.name}</span>
        <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300">${cable.cores}H</span>
      </div>
      <div class="space-y-1">
        ${Array.from({ length: displayCores }, (_, i) => {
          const fiberNum = i + 1;
          const fc = getFiberColor(fiberNum);
          const ep = { kind: 'cable', cableId: cable.id, fiber: fiberNum };
          const active = isEndpointSpliced(ep);
          const selected = isPendingSource(ep);

          return `
            <div data-ep='${JSON.stringify(ep)}'
                 onclick='handleSpliceEndpointClick(${JSON.stringify(ep)})'
                 class="splice-pin flex items-center justify-between px-2 py-1 rounded-lg text-xs cursor-pointer transition border ${selected ? 'bg-cyan-500/25 border-cyan-400 text-white' : active ? 'bg-slate-900 border-emerald-500/40 text-slate-100' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-600 text-slate-300'}">
              <div class="flex items-center gap-2 min-w-0">
                <span class="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center text-[8px] font-mono font-bold"
                      style="background:${fc.hex}; color:${fc.text}; border:1px solid ${fc.border || 'rgba(255,255,255,0.2)'}">
                  ${fiberNum}
                </span>
                <span class="truncate text-[11px]">${fc.name}</span>
              </div>
              <span class="w-2 h-2 rounded-full shrink-0 ${active ? 'bg-emerald-400' : 'bg-slate-700'}"></span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function formatEndpointLabel(ep) {
  if (ep.kind === 'oltPort') return `OLT PON 0/${ep.port}`;
  if (ep.kind === 'splitterIn') return `Splitter IN`;
  if (ep.kind === 'splitterOut') return `Splitter OUT P${ep.port}`;
  if (ep.kind === 'cable') {
    const cab = appState.cables.find(c => c.id === ep.cableId);
    const fc = getFiberColor(ep.fiber);
    return `${cab ? cab.name.slice(0, 14) : 'Cable'} &bull; H${ep.fiber}(${fc.name})`;
  }
  return '';
}

function handleSpliceEndpointClick(ep) {
  const node = appState.nodes.find(n => n.id === appState.splicingNodeId);
  if (!node) return;

  if (!appState.pendingSpliceSource) {
    appState.pendingSpliceSource = ep;
    document.getElementById('splice-selection-status').textContent = `Origen seleccionado: ${formatEndpointLabel(ep)} -> Ahora haz clic en el destino.`;
    renderSpliceModalContent();
    setTimeout(drawSpliceSvgCurves, 20);
    return;
  }

  if (endpointsMatch(appState.pendingSpliceSource, ep)) {
    appState.pendingSpliceSource = null;
    document.getElementById('splice-selection-status').textContent = 'Selección cancelada.';
    renderSpliceModalContent();
    setTimeout(drawSpliceSvgCurves, 20);
    return;
  }

  node.splices = node.splices || [];
  node.splices.push({
    id: generateId('sp'),
    from: appState.pendingSpliceSource,
    to: ep
  });

  document.getElementById('splice-selection-status').textContent = `Fusionado: ${formatEndpointLabel(appState.pendingSpliceSource)} <-> ${formatEndpointLabel(ep)}`;
  appState.pendingSpliceSource = null;
  renderSpliceModalContent();
  setTimeout(drawSpliceSvgCurves, 20);
}

function removeSplice(spliceId) {
  const node = appState.nodes.find(n => n.id === appState.splicingNodeId);
  if (!node) return;
  node.splices = (node.splices || []).filter(s => s.id !== spliceId);
  renderSpliceModalContent();
  setTimeout(drawSpliceSvgCurves, 20);
}

function clearNodeSplices() {
  const node = appState.nodes.find(n => n.id === appState.splicingNodeId);
  if (!node) return;
  node.splices = [];
  appState.pendingSpliceSource = null;
  renderSpliceModalContent();
  setTimeout(drawSpliceSvgCurves, 20);
}

function changeNodeSplitterInModal(nodeId, ratio) {
  const node = appState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  node.splitter = ratio;
  renderSpliceModalContent();
  setTimeout(drawSpliceSvgCurves, 20);
}

function autoMassSplice1to1() {
  const node = appState.nodes.find(n => n.id === appState.splicingNodeId);
  if (!node) return;
  const incoming = appState.cables.filter(c => c.toNodeId === node.id);
  const outgoing = appState.cables.filter(c => c.fromNodeId === node.id);

  if (incoming.length === 0 || outgoing.length === 0) {
    showToast('Se requiere al menos 1 cable entrante y 1 saliente para fusión masiva 1:1', 'warning');
    return;
  }

  const cabIn = incoming[0];
  const cabOut = outgoing[0];
  const maxPairs = Math.min(cabIn.cores, cabOut.cores, 24);
  node.splices = node.splices || [];

  let added = 0;
  for (let f = 1; f <= maxPairs; f++) {
    const epFrom = { kind: 'cable', cableId: cabIn.id, fiber: f };
    const epTo = { kind: 'cable', cableId: cabOut.id, fiber: f };
    const alreadyUsed = node.splices.some(s => endpointsMatch(s.from, epFrom) || endpointsMatch(s.to, epTo));
    if (!alreadyUsed) {
      node.splices.push({ id: generateId('sp'), from: epFrom, to: epTo });
      added++;
    }
  }

  renderSpliceModalContent();
  setTimeout(drawSpliceSvgCurves, 20);
  showToast(`Fusión masiva 1:1 completada (${added} hilos empalmados)`, 'success');
}

function drawSpliceSvgCurves() {
  const svg = document.getElementById('splice-connections-svg');
  const workspace = document.getElementById('splice-workspace');
  const node = appState.nodes.find(n => n.id === appState.splicingNodeId);
  if (!svg || !workspace || !node) return;

  const wsRect = workspace.getBoundingClientRect();
  const pins = Array.from(workspace.querySelectorAll('.splice-pin'));

  const findPinCenter = (ep) => {
    const el = pins.find(p => {
      try {
        return endpointsMatch(JSON.parse(p.getAttribute('data-ep')), ep);
      } catch { return false; }
    });
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left - wsRect.left + r.width / 2,
      y: r.top - wsRect.top + r.height / 2
    };
  };

  const paths = (node.splices || []).map(sp => {
    const p1 = findPinCenter(sp.from);
    const p2 = findPinCenter(sp.to);
    if (!p1 || !p2) return '';

    let color = '#38bdf8';
    if (sp.from.kind === 'cable') color = getFiberColor(sp.from.fiber).hex;
    else if (sp.to.kind === 'cable') color = getFiberColor(sp.to.fiber).hex;

    const cx1 = p1.x + (p2.x - p1.x) * 0.45;
    const cx2 = p2.x - (p2.x - p1.x) * 0.45;

    return `
      <path d="M ${p1.x} ${p1.y} C ${cx1} ${p1.y}, ${cx2} ${p2.y}, ${p2.x} ${p2.y}"
            fill="none" stroke="${color}" stroke-width="2.5" stroke-opacity="0.85" />
      <circle cx="${(p1.x + p2.x) / 2}" cy="${(p1.y + p2.y) / 2}" r="4" fill="#f59e0b" stroke="#090d16" stroke-width="1.5" />
    `;
  }).join('');

  svg.innerHTML = paths;
}
