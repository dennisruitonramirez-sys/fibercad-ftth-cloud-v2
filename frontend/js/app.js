/**
 * Orquestador principal de la aplicación: inicialización, red de ejemplo,
 * navegación entre pestañas, zoom, exportación/importación JSON y notificaciones.
 */
window.onload = function () {
  renderTiaLegend();
  loadDemoProject();
  setupCanvasEvents();
  refreshCloudProjectsDropdown(appState.projectId);
};

function renderTiaLegend() {
  const bar = document.getElementById('tia-legend-bar');
  bar.innerHTML = TIA_598_COLORS.map(c => `
    <div class="h-4 rounded text-[9px] font-mono font-bold flex items-center justify-center shadow-sm"
         style="background:${c.hex}; color:${c.text}; border: 1px solid ${c.border || 'rgba(255,255,255,0.15)'}"
         title="Hilo ${c.index}: ${c.name}">
      ${c.index}
    </div>
  `).join('');
}

function newBlankProject() {
  appState.projectId = `proj_${Date.now()}`;
  appState.projectName = 'Nuevo Proyecto FTTH Sin Título';
  appState.nodes = [];
  appState.cables = [];
  appState.selectedItem = null;
  appState.drawingCable = null;
  document.getElementById('project-subtitle').textContent = `Proyecto: ${appState.projectName}`;
  renderAll();
  showToast('Lienzo limpio listo para diseñar tu red FTTH', 'info');
}

function loadDemoProject() {
  appState.projectId = 'proj_demo_01';
  appState.projectName = 'Red Troncal & Distribución GPON — Sector Norte';
  document.getElementById('project-subtitle').textContent = `Proyecto: ${appState.projectName}`;

  const olt = {
    id: 'node_olt1', type: 'OLT', name: 'OLT-CENTRAL-01', x: 100, y: 240,
    ports: 8, txPower: 5.0, reserveMeters: 15,
    splices: [
      { id: 'sp_olt_1', from: { kind: 'oltPort', port: 1 }, to: { kind: 'cable', cableId: 'cab_patch1', fiber: 1 } },
      { id: 'sp_olt_2', from: { kind: 'oltPort', port: 2 }, to: { kind: 'cable', cableId: 'cab_patch1', fiber: 2 } }
    ]
  };

  const odf = {
    id: 'node_odf1', type: 'ODF', name: 'ODF-CABECERA-01', x: 250, y: 240,
    trays: 2, reserveMeters: 20, splitter: 'none',
    splices: [
      { id: 'sp_odf_1', from: { kind: 'cable', cableId: 'cab_patch1', fiber: 1 }, to: { kind: 'cable', cableId: 'cab_troncal1', fiber: 1 } },
      { id: 'sp_odf_2', from: { kind: 'cable', cableId: 'cab_patch1', fiber: 2 }, to: { kind: 'cable', cableId: 'cab_troncal1', fiber: 2 } }
    ]
  };

  const poste1 = {
    id: 'node_p1', type: 'POSTE', name: 'POSTE-P01 (Reserva)', x: 420, y: 240,
    reserveMeters: 30, splices: []
  };

  const mufa1 = {
    id: 'node_mufa1', type: 'MUFA', name: 'MUFA-TRONCAL-01', x: 580, y: 240,
    trays: 4, reserveMeters: 25, splitter: '1:4',
    splices: [
      { id: 'sp_m1_in', from: { kind: 'cable', cableId: 'cab_troncal1', fiber: 1 }, to: { kind: 'splitterIn', port: 1 } },
      { id: 'sp_m1_o1', from: { kind: 'splitterOut', port: 1 }, to: { kind: 'cable', cableId: 'cab_dist1', fiber: 1 } },
      { id: 'sp_m1_o2', from: { kind: 'splitterOut', port: 2 }, to: { kind: 'cable', cableId: 'cab_dist2', fiber: 1 } },
      { id: 'sp_m1_pass', from: { kind: 'cable', cableId: 'cab_troncal1', fiber: 2 }, to: { kind: 'cable', cableId: 'cab_dist1', fiber: 2 } }
    ]
  };

  const nap1 = {
    id: 'node_nap1', type: 'NAP', name: 'NAP-N01 (16P)', x: 800, y: 120,
    ports: 8, reserveMeters: 15, splitter: '1:8',
    splices: [
      { id: 'sp_nap1_in', from: { kind: 'cable', cableId: 'cab_dist1', fiber: 1 }, to: { kind: 'splitterIn', port: 1 } },
      { id: 'sp_nap1_o1', from: { kind: 'splitterOut', port: 1 }, to: { kind: 'cable', cableId: 'cab_drop1', fiber: 1 } },
      { id: 'sp_nap1_o2', from: { kind: 'splitterOut', port: 2 }, to: { kind: 'cable', cableId: 'cab_drop2', fiber: 1 } }
    ]
  };

  const nap2 = {
    id: 'node_nap2', type: 'NAP', name: 'NAP-S02 (8P)', x: 800, y: 370,
    ports: 8, reserveMeters: 15, splitter: '1:8',
    splices: [
      { id: 'sp_nap2_in', from: { kind: 'cable', cableId: 'cab_dist2', fiber: 1 }, to: { kind: 'splitterIn', port: 1 } },
      { id: 'sp_nap2_o1', from: { kind: 'splitterOut', port: 1 }, to: { kind: 'cable', cableId: 'cab_drop3', fiber: 1 } }
    ]
  };

  const ont1 = { id: 'node_ont1', type: 'ONT', name: 'ONT-CLI-101', x: 980, y: 70,  sensitivity: -27.0, splices: [] };
  const ont2 = { id: 'node_ont2', type: 'ONT', name: 'ONT-CLI-102', x: 980, y: 170, sensitivity: -27.0, splices: [] };
  const ont3 = { id: 'node_ont3', type: 'ONT', name: 'ONT-CLI-201', x: 980, y: 370, sensitivity: -27.0, splices: [] };

  appState.nodes = [olt, odf, poste1, mufa1, nap1, nap2, ont1, ont2, ont3];

  appState.cables = [
    {
      id: 'cab_patch1', name: 'Cordón Patchcord OLT-ODF', type: 'troncal', cores: 12,
      fromNodeId: 'node_olt1', toNodeId: 'node_odf1', waypoints: [], reserveMeters: 5
    },
    {
      id: 'cab_troncal1', name: 'Troncal ADSS 24H Principal', type: 'troncal', cores: 24,
      fromNodeId: 'node_odf1', toNodeId: 'node_mufa1',
      waypoints: [{ x: 420, y: 240 }],
      reserveMeters: 40
    },
    {
      id: 'cab_dist1', name: 'Distribución Ramal Norte 12H', type: 'distribucion', cores: 12,
      fromNodeId: 'node_mufa1', toNodeId: 'node_nap1',
      waypoints: [{ x: 660, y: 120 }],
      reserveMeters: 20
    },
    {
      id: 'cab_dist2', name: 'Distribución Ramal Sur 12H', type: 'distribucion', cores: 12,
      fromNodeId: 'node_mufa1', toNodeId: 'node_nap2',
      waypoints: [{ x: 660, y: 370 }],
      reserveMeters: 20
    },
    {
      id: 'cab_drop1', name: 'Drop Cliente 101', type: 'drop', cores: 1,
      fromNodeId: 'node_nap1', toNodeId: 'node_ont1', waypoints: [], reserveMeters: 10
    },
    {
      id: 'cab_drop2', name: 'Drop Cliente 102', type: 'drop', cores: 1,
      fromNodeId: 'node_nap1', toNodeId: 'node_ont2', waypoints: [], reserveMeters: 10
    },
    {
      id: 'cab_drop3', name: 'Drop Cliente 201', type: 'drop', cores: 1,
      fromNodeId: 'node_nap2', toNodeId: 'node_ont3', waypoints: [], reserveMeters: 15
    }
  ];

  appState.selectedItem = { kind: 'node', id: 'node_mufa1' };
  appState.viewport = { x: 30, y: 40, zoom: 0.95 };
  renderAll();
  showToast('Red FTTH de ejemplo cargada con fusiones, reservas y cálculo GPON', 'success');
}

async function refreshCloudProjectsDropdown(selectedId = appState.projectId) {
  const select = document.getElementById('cloud-project-select');
  if (!select) return;

  const projects = await FiberApiClient.listProjects();
  const options = [];

  if (selectedId && !projects.some(p => p.id === selectedId)) {
    options.push(`<option value="${selectedId}" selected>${appState.projectName || selectedId}</option>`);
  }

  projects.forEach(p => {
    const isSel = p.id === selectedId ? 'selected' : '';
    options.push(`<option value="${p.id}" ${isSel}>${p.name} (${p.id})</option>`);
  });

  if (options.length === 0) {
    options.push(`<option value="${selectedId || 'proj_demo_01'}">${appState.projectName || 'Proyecto FTTH'}</option>`);
  }

  select.innerHTML = options.join('');
}

async function handleCloudProjectChange(projectId) {
  if (!projectId) return;
  await FiberApiClient.loadProjectFromServer(projectId);
}

async function saveCurrentProjectToCloud() {
  const customName = window.prompt('Nombre del proyecto FTTH para guardar en la nube:', appState.projectName);
  if (customName && customName.trim()) {
    appState.projectName = customName.trim();
    document.getElementById('project-subtitle').textContent = `Proyecto: ${appState.projectName}`;
  }
  const targetId = appState.projectId || `proj_${Date.now()}`;
  await FiberApiClient.saveProjectToServer(targetId);
}

function renderAll() {
  const opticalMap = computeOpticalNetwork();
  renderCanvas(opticalMap);
  renderInspector(opticalMap);
  updateBottomStatusBar();

  if (!document.getElementById('view-unifilar').classList.contains('hidden')) {
    renderSingleLineDiagram(opticalMap);
  }
  if (!document.getElementById('view-budget').classList.contains('hidden')) {
    renderBudgetAndBOM(opticalMap);
  }
}

function switchMainTab(tab) {
  ['canvas', 'unifilar', 'budget'].forEach(t => {
    document.getElementById(`view-${t}`).classList.add('hidden');
    document.getElementById(`view-${t}`).classList.remove('flex');
    const btn = document.getElementById(`tab-btn-${t}`);
    btn.classList.remove('bg-slate-800', 'text-cyan-400', 'shadow');
    btn.classList.add('text-slate-400');
  });

  const activeView = document.getElementById(`view-${tab}`);
  activeView.classList.remove('hidden');
  activeView.classList.add('flex');

  const activeBtn = document.getElementById(`tab-btn-${tab}`);
  activeBtn.classList.add('bg-slate-800', 'text-cyan-400', 'shadow');
  activeBtn.classList.remove('text-slate-400');

  const leftSb = document.getElementById('left-sidebar');
  const rightSb = document.getElementById('right-sidebar');
  if (tab === 'canvas') {
    leftSb.classList.remove('hidden');
    rightSb.classList.remove('hidden');
  } else {
    leftSb.classList.add('hidden');
    rightSb.classList.add('hidden');
  }

  if (tab === 'unifilar') renderSingleLineDiagram();
  if (tab === 'budget') renderBudgetAndBOM();
}

function setTool(tool) {
  appState.activeTool = tool;
  cancelCableDrawing();

  ['select', 'cable', 'pan'].forEach(t => {
    const btn = document.getElementById(`tool-${t}`);
    if (t === tool) {
      btn.classList.add('bg-cyan-600/20', 'text-cyan-300', 'border-cyan-500/40');
      btn.classList.remove('bg-slate-850', 'text-slate-300', 'border-slate-800');
    } else {
      btn.classList.remove('bg-cyan-600/20', 'text-cyan-300', 'border-cyan-500/40');
      btn.classList.add('bg-slate-850', 'text-slate-300', 'border-slate-800');
    }
  });

  const cableOpts = document.getElementById('cable-tool-options');
  if (tool === 'cable') cableOpts.classList.remove('hidden');
  else cableOpts.classList.add('hidden');

  const svg = document.getElementById('network-svg');
  svg.style.cursor = tool === 'pan' ? 'grab' : tool === 'cable' ? 'crosshair' : 'default';
}

function setMapMode(mode) {
  appState.mapMode = mode;
  const cadBtn = document.getElementById('btn-mode-cad');
  const gisBtn = document.getElementById('btn-mode-gis');
  const banner = document.getElementById('gis-mode-banner');

  if (mode === 'gis') {
    gisBtn.classList.add('bg-emerald-600/20', 'text-emerald-300', 'border', 'border-emerald-500/30');
    gisBtn.classList.remove('text-slate-400');
    cadBtn.classList.remove('bg-cyan-600/20', 'text-cyan-300', 'border', 'border-cyan-500/30');
    cadBtn.classList.add('text-slate-400');
    banner.classList.remove('hidden');
  } else {
    cadBtn.classList.add('bg-cyan-600/20', 'text-cyan-300', 'border', 'border-cyan-500/30');
    cadBtn.classList.remove('text-slate-400');
    gisBtn.classList.remove('bg-emerald-600/20', 'text-emerald-300', 'border', 'border-emerald-500/30');
    gisBtn.classList.add('text-slate-400');
    banner.classList.add('hidden');
  }
  renderCanvas(computeOpticalNetwork());
}

function zoomCanvas(factor) {
  appState.viewport.zoom = Math.min(2.8, Math.max(0.35, appState.viewport.zoom * factor));
  renderCanvas(computeOpticalNetwork());
}

function resetView() {
  appState.viewport = { x: 40, y: 40, zoom: 1.0 };
  renderCanvas(computeOpticalNetwork());
}

function updateScale(val) {
  appState.scaleMetersPerGrid = Math.max(1, Number(val) || 50);
  renderAll();
}

function updateBottomStatusBar() {
  let totalM = 0;
  appState.cables.forEach(c => {
    totalM += calculateCableRouteMeters(c) + Number(c.reserveMeters || 0);
  });
  totalM += appState.nodes.reduce((acc, n) => acc + Number(n.reserveMeters || 0), 0);
  const totalSplices = appState.nodes.reduce((acc, n) => acc + (n.splices?.length || 0), 0);

  document.getElementById('status-total-fiber').textContent = `Fibra Total: ${totalM} m`;
  document.getElementById('status-total-splices').textContent = `Fusiones Activas: ${totalSplices}`;
}

function exportProjectJSON() {
  const dataStr = JSON.stringify({
    version: '1.0',
    projectId: appState.projectId || `proj_${Date.now()}`,
    projectName: appState.projectName,
    scaleMetersPerGrid: appState.scaleMetersPerGrid,
    gisOrigin: appState.gisOrigin,
    nodes: appState.nodes,
    cables: appState.cables
  }, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `proyecto_ftth_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Proyecto FTTH exportado en formato JSON', 'success');
}

function importProjectJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed.nodes && parsed.cables) {
        appState.projectId = parsed.projectId || `proj_${Date.now()}`;
        appState.projectName = parsed.projectName || 'Proyecto Importado';
        appState.scaleMetersPerGrid = parsed.scaleMetersPerGrid || 50;
        appState.nodes = parsed.nodes;
        appState.cables = parsed.cables;
        appState.selectedItem = null;
        document.getElementById('project-subtitle').textContent = `Proyecto: ${appState.projectName}`;
        renderAll();
        refreshCloudProjectsDropdown(appState.projectId);
        showToast('Proyecto importado correctamente', 'success');
      }
    } catch (err) {
      showToast('Error al leer el archivo JSON', 'warning');
    }
  };
  reader.readAsText(file);
}

function normalizeSvgForLightPrint(svgEl) {
  if (!svgEl) return;

  const lightColors = new Set([
    '#fff', '#ffffff', '#f8fafc', '#f1f5f9', '#e2e8f0',
    '#cbd5e1', '#94a3b8', '#64748b', 'white', 'rgb(255, 255, 255)',
    'rgb(226, 232, 240)', 'rgb(203, 213, 225)', 'rgb(148, 163, 184)'
  ]);

  svgEl.querySelectorAll('text, tspan').forEach(el => {
    const fill = (el.getAttribute('fill') || '').trim().toLowerCase();
    if (!fill || lightColors.has(fill)) {
      el.setAttribute('fill', '#0f172a');
    }
  });

  svgEl.querySelectorAll('rect, path, line, polygon').forEach(el => {
    const fill = (el.getAttribute('fill') || '').trim().toLowerCase();
    if (fill === '#090d16' || fill === '#0b1120' || fill === '#020617' || fill === '#0f172a') {
      el.setAttribute('fill', '#f8fafc');
    }
  });
}  //función para pdf no se pierda los colores cuando el fondo se haga blanco

function exportSpecificPDF(kind = 'cad') {
  const projectTitle = appState.projectName || 'Proyecto FTTH';
  const nowStr = new Date().toLocaleString();

  let docTitle = `Plano CAD FTTH — ${projectTitle}`;
  let contentHtml = '';

  if (kind === 'cad') {
    docTitle = `Plano CAD FTTH — ${projectTitle}`;
    const netSvg = document.getElementById('network-svg');
    if (!netSvg) {
      showToast('No se encontró el SVG del Plano CAD', 'warning');
      return;
    }

    const clonedSvg = netSvg.cloneNode(true);
    const vpGroup = clonedSvg.querySelector('#viewport-group') || clonedSvg.firstElementChild;
    if (vpGroup && vpGroup.tagName.toLowerCase() === 'g') {
      vpGroup.removeAttribute('transform');
    }

    const xs = [];
    const ys = [];
    const nodeMap = {};

    (appState.nodes || []).forEach(n => {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        nodeMap[n.id] = n;
        xs.push(n.x, n.x + 120);
        ys.push(n.y, n.y + 90);
      }
    });

    (appState.cables || []).forEach(c => {
      const fromNode = nodeMap[c.fromNodeId];
      const toNode = nodeMap[c.toNodeId];
      if (fromNode) {
        xs.push(fromNode.x + 30);
        ys.push(fromNode.y + 30);
      }
      if (toNode) {
        xs.push(toNode.x + 30);
        ys.push(toNode.y + 30);
      }
      (c.waypoints || []).forEach(wp => {
        if (typeof wp.x === 'number' && typeof wp.y === 'number') {
          xs.push(wp.x);
          ys.push(wp.y);
        }
      });
    });

    if (xs.length && ys.length) {
      const minX = Math.min(...xs) - 160;
      const minY = Math.min(...ys) - 140;
      const maxX = Math.max(...xs) + 180;
      const maxY = Math.max(...ys) + 160;
      const viewW = Math.max(900, maxX - minX);
      const viewH = Math.max(560, maxY - minY);
      clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${viewW} ${viewH}`);
      clonedSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    }

    clonedSvg.removeAttribute('width');
    clonedSvg.removeAttribute('height');
    clonedSvg.classList.remove('w-full', 'h-full');
    normalizeSvgForLightPrint(clonedSvg);
    contentHtml = clonedSvg.outerHTML;
  } else if (kind === 'unifilar') {
    docTitle = `Diagrama Unifilar FTTH — ${projectTitle}`;
    renderSingleLineDiagram();
    const unifilarSvg = document.querySelector('#unifilar-container svg');
    if (!unifilarSvg) {
      showToast('No se pudo generar el Diagrama Unifilar', 'warning');
      return;
    }

    const clonedUnifilar = unifilarSvg.cloneNode(true);
    if (!clonedUnifilar.getAttribute('viewBox')) {
      const w = Number(clonedUnifilar.getAttribute('width')) || 1200;
      const h = Number(clonedUnifilar.getAttribute('height')) || 600;
      clonedUnifilar.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    clonedUnifilar.removeAttribute('width');
    clonedUnifilar.removeAttribute('height');
    normalizeSvgForLightPrint(clonedUnifilar);
    contentHtml = clonedUnifilar.outerHTML;

  } else if (kind === 'budget') {
    docTitle = `Presupuesto Óptico y Metrado BOM — ${projectTitle}`;
    const opticalMap = typeof computeOpticalNetwork === 'function' ? computeOpticalNetwork() : null;
    if (typeof renderBudgetAndBOM === 'function') {
      renderBudgetAndBOM(opticalMap);
    }

    const budgetView = document.getElementById('view-budget');
    if (!budgetView) {
      showToast('No se pudo generar el Presupuesto y BOM', 'warning');
      return;
    }

    const clonedBudget = budgetView.cloneNode(true);
    clonedBudget.classList.remove('hidden', 'flex', 'grid', 'overflow-hidden', 'overflow-auto', 'h-full');
    clonedBudget.querySelectorAll('*').forEach(el => {
      el.classList.remove(
        'hidden', 'overflow-hidden', 'overflow-auto',
        'overflow-y-auto', 'overflow-x-auto', 'h-full', 'max-h-screen',
        'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'lg:grid-cols-2', 'xl:grid-cols-4'
      );
    });
    clonedBudget.querySelectorAll('button').forEach(btn => btn.remove());
    contentHtml = clonedBudget.innerHTML;
  }

  let portal = document.getElementById('print-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.id = 'print-portal';
    document.body.appendChild(portal);
  }

  portal.innerHTML = `
    <div class="pdf-header">
      <h1 style="margin:0;font-size:15px;">${docTitle}</h1>
      <span style="font-size:11px;">${nowStr}</span>
    </div>
    <div>${contentHtml}</div>
  `;

  const cleanup = () => {
    document.body.classList.remove('printing-mode');
    if (portal) portal.innerHTML = '';
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);
  document.body.classList.add('printing-mode');
  setTimeout(() => window.print(), 120);
} //funcion para generar pdf

let toastTimer = null;
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast-notification');
  const icon = document.getElementById('toast-icon');
  document.getElementById('toast-message').textContent = msg;

  if (type === 'warning') {
    icon.className = 'fa-solid fa-triangle-exclamation text-amber-400 text-sm';
  } else if (type === 'info') {
    icon.className = 'fa-solid fa-circle-info text-cyan-400 text-sm';
  } else {
    icon.className = 'fa-solid fa-circle-check text-emerald-400 text-sm';
  }

  toast.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('translate-y-20', 'opacity-0');
  }, 3200);
}

async function deleteCurrentProject() {
  const idToDelete = appState.projectId;
  if (!idToDelete) {
    showToast('No hay un proyecto guardado seleccionado para borrar', 'info');
    return;
  }
  const confirmed = window.confirm(`¿Seguro que deseas borrar el proyecto "${appState.projectName}" de la nube? Esta acción no se puede deshacer.`);
  if (!confirmed) return;
  await FiberApiClient.deleteProjectFromServer(idToDelete);
}