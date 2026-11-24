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

function exportSpecificPDF(kind = 'cad') {
  const projectTitle = appState.projectName || 'Proyecto FTTH';
  const nowStr = new Date().toLocaleString();

  let docTitle = 'Plano CAD FTTH';
  let bodyContent = '';

  if (kind === 'cad') {
    docTitle = `Plano CAD FTTH — ${projectTitle}`;
    const netSvg = document.getElementById('network-svg');
    if (!netSvg) {
      showToast('No se encontró el SVG del Plano CAD', 'warning');
      return;
    }

    const clonedSvg = netSvg.cloneNode(true);
    // Quitar transformaciones de pan/zoom del viewport para encuadrar toda la red
    const vpGroup = clonedSvg.querySelector('#viewport-group') || clonedSvg.firstElementChild;
    if (vpGroup && vpGroup.tagName.toLowerCase() === 'g') {
      vpGroup.removeAttribute('transform');
    }

    const xs = [];
    const ys = [];
    (appState.nodes || []).forEach(n => {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        xs.push(n.x);
        ys.push(n.y);
      }
    });
    (appState.cables || []).forEach(c => {
      (c.waypoints || []).forEach(wp => {
        if (typeof wp.x === 'number' && typeof wp.y === 'number') {
          xs.push(wp.x);
          ys.push(wp.y);
        }
      });
    });

    if (xs.length && ys.length) {
      const minX = Math.min(...xs) - 140;
      const minY = Math.min(...ys) - 120;
      const maxX = Math.max(...xs) + 160;
      const maxY = Math.max(...ys) + 140;
      const w = Math.max(800, maxX - minX);
      const h = Math.max(500, maxY - minY);
      clonedSvg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
    }
    clonedSvg.removeAttribute('width');
    clonedSvg.removeAttribute('height');
    clonedSvg.style.width = '100%';
    clonedSvg.style.height = 'auto';
    clonedSvg.style.maxHeight = '78vh';
    clonedSvg.style.display = 'block';

    bodyContent = `<div class="svg-box">${clonedSvg.outerHTML}</div>`;

  } else if (kind === 'unifilar') {
    docTitle = `Diagrama Unifilar FTTH — ${projectTitle}`;
    renderSingleLineDiagram();
    const unifilarSvg = document.querySelector('#unifilar-container svg');
    if (!unifilarSvg) {
      showToast('No se pudo generar el Diagrama Unifilar', 'warning');
      return;
    }

    const clonedUnifilar = unifilarSvg.cloneNode(true);
    const vb = clonedUnifilar.getAttribute('viewBox');
    let w = 1200;
    let h = 600;
    if (vb) {
      const parts = vb.trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts.every(n => !Number.isNaN(n))) {
        w = parts[2] || w;
        h = parts[3] || h;
      }
    } else {
      w = Number(clonedUnifilar.getAttribute('width')) || 1200;
      h = Number(clonedUnifilar.getAttribute('height')) || 600;
      clonedUnifilar.setAttribute('viewBox', `0 0 ${w} ${h}`);
    }

    clonedUnifilar.removeAttribute('width');
    clonedUnifilar.removeAttribute('height');
    clonedUnifilar.style.width = '100%';
    clonedUnifilar.style.height = 'auto';
    clonedUnifilar.style.maxHeight = '78vh';
    clonedUnifilar.style.display = 'block';

    bodyContent = `<div class="svg-box">${clonedUnifilar.outerHTML}</div>`;

  } else if (kind === 'budget') {
    docTitle = `Presupuesto Óptico y Metrado BOM — ${projectTitle}`;
    renderBudgetAndBOM();
    const budgetContainer = document.querySelector('#view-budget > div') || document.getElementById('view-budget');
    if (!budgetContainer) {
      showToast('No se pudo generar el Presupuesto y BOM', 'warning');
      return;
    }

    const clonedBudget = budgetContainer.cloneNode(true);
    clonedBudget.querySelectorAll('button').forEach(btn => btn.remove());
    bodyContent = `<div class="budget-box">${clonedBudget.innerHTML}</div>`;
  }

  const printWin = window.open('', '_blank', 'width=1100,height=780');
  if (!printWin) {
    showToast('Permite las ventanas emergentes para generar el PDF', 'warning');
    return;
  }

  printWin.document.open();
  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>${docTitle}</title>
      <style>
        @page {
          size: landscape;
          margin: 8mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 12px;
          background: #090d16;
          color: #e2e8f0;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .pdf-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          border-bottom: 1px solid #1e293b;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .pdf-header h1 {
          margin: 0;
          font-size: 16px;
          color: #38bdf8;
        }
        .pdf-header span {
          font-size: 11px;
          color: #94a3b8;
        }
        .svg-box {
          width: 100%;
          background: #0b1120;
          border: 1px solid #1e293b;
          border-radius: 8px;
          padding: 8px;
        }
        .budget-box table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 12px;
        }
        .budget-box th, .budget-box td {
          border: 1px solid #334155;
          padding: 6px 8px;
          text-align: left;
        }
        .budget-box tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .print-actions {
          margin-bottom: 10px;
          display: flex;
          gap: 8px;
        }
        .print-actions button {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #0284c7;
          background: #0369a1;
          color: #fff;
          cursor: pointer;
          font-size: 12px;
        }
        @media print {
          .print-actions {
            display: none !important;
          }
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-actions">
        <button onclick="window.print()">Guardar / Imprimir PDF</button>
        <button onclick="window.close()" style="background:#1e293b;border-color:#475569;">Cerrar</button>
      </div>
      <div class="pdf-header">
        <h1>${docTitle}</h1>
        <span>Generado: ${nowStr}</span>
      </div>
      ${bodyContent}
      <script>
        window.onload = function () {
          setTimeout(function () {
            window.print();
          }, 250);
        };
      <\/script>
    </body>
    </html>
  `);
  printWin.document.close();
}

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