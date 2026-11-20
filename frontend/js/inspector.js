/**
 * Panel lateral derecho (Inspector) para editar nodos y cables seleccionados.
 */
function renderInspector(opticalMap) {
  const container = document.getElementById('inspector-content');
  const badge = document.getElementById('inspector-badge');

  if (!appState.selectedItem) {
    badge.textContent = 'Ninguno';
    container.innerHTML = `
      <div class="h-full flex flex-col items-center justify-center text-center text-slate-500 p-4">
        <div class="w-12 h-12 rounded-2xl bg-slate-850 border border-slate-800 flex items-center justify-center mb-3 text-slate-400">
          <i class="fa-solid fa-arrow-pointer text-lg"></i>
        </div>
        <p class="text-xs font-medium text-slate-300 mb-1">Selecciona un nodo o cable</p>
        <p class="text-[11px] leading-relaxed">Haz clic en cualquier elemento del plano para editar sus parámetros, añadir reservas de fibra o abrir el <strong class="text-cyan-400">Gestor de Fusiones</strong>.</p>
      </div>
    `;
    return;
  }

  if (appState.selectedItem.kind === 'node') {
    const node = appState.nodes.find(n => n.id === appState.selectedItem.id);
    if (!node) return;
    badge.textContent = node.type;
    const opt = opticalMap[node.id];
    const sig = getSignalStatusBadge(opt?.rxPower);
    const gis = cadToLatLng(node.x, node.y);
    const isSpliceable = ['OLT', 'ODF', 'MUFA', 'NAP', 'SPLITTER'].includes(node.type);

    container.innerHTML = `
      <div class="space-y-4">
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div>
            <label class="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Etiqueta / Nombre</label>
            <input type="text" value="${node.name}" onchange="updateNodeProp('${node.id}', 'name', this.value)"
                   class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:border-cyan-500 focus:outline-none" />
          </div>

          <div class="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/80 p-2 rounded-lg border border-slate-800">
            <div>
              <span class="text-slate-500 block text-[9px]">LATITUD (GIS)</span>
              <span class="text-slate-300">${gis.lat}</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[9px]">LONGITUD (GIS)</span>
              <span class="text-slate-300">${gis.lng}</span>
            </div>
          </div>
        </div>

        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-semibold text-slate-300">Telemetría Óptica</span>
            <span class="text-[10px] font-mono px-2 py-0.5 rounded border ${sig.bg}">${sig.status}</span>
          </div>
          ${opt ? `
            <div class="grid grid-cols-2 gap-2 pt-1">
              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400">${node.type === 'OLT' ? 'Potencia TX' : 'Potencia RX'}</div>
                <div class="text-sm font-mono font-bold text-cyan-300">${opt.rxPower > 0 ? '+' : ''}${opt.rxPower} dBm</div>
              </div>
              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400">Distancia Acum.</div>
                <div class="text-sm font-mono font-bold text-slate-200">${opt.totalDistMeters} m</div>
              </div>
              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400">Atenuación Total</div>
                <div class="text-xs font-mono font-semibold text-amber-300">${opt.totalLoss} dB</div>
              </div>
              <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
                <div class="text-[10px] text-slate-400">Cascada Split</div>
                <div class="text-xs font-mono font-semibold text-purple-300">${opt.splitChain.length ? opt.splitChain.join(' &rarr; ') : 'Directo'}</div>
              </div>
            </div>
          ` : `
            <p class="text-[11px] text-slate-500 italic py-1">Sin señal óptica desde OLT. Verifica los empalmes/fusiones en los nodos previos.</p>
          `}
        </div>

        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
          <div class="text-[11px] font-semibold text-slate-300">Parámetros Técnicos</div>

          ${node.type === 'OLT' ? `
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Puertos PON</label>
                <select onchange="updateNodeProp('${node.id}', 'ports', Number(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono">
                  ${[4, 8, 16, 32].map(p => `<option value="${p}" ${node.ports == p ? 'selected' : ''}>${p} Puertos</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="text-[10px] text-slate-400 block mb-1">Potencia SFP (dBm)</label>
                <input type="number" step="0.5" min="1" max="10" value="${node.txPower}" onchange="updateNodeProp('${node.id}', 'txPower', Number(this.value))"
                       class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono" />
              </div>
            </div>
          ` : ''}

          ${['MUFA', 'NAP', 'SPLITTER', 'ODF'].includes(node.type) ? `
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Splitter Óptico Interno (PLC / FBT)</label>
              <select onchange="updateNodeProp('${node.id}', 'splitter', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono">
                ${Object.entries(SPLITTER_SPECS).map(([key, val]) => `
                  <option value="${key}" ${(node.splitter || 'none') === key ? 'selected' : ''}>${val.label}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          ${node.type === 'NAP' ? `
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Capacidad de Adaptadores SC/APC</label>
              <select onchange="updateNodeProp('${node.id}', 'ports', Number(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono">
                ${[8, 16, 24].map(p => `<option value="${p}" ${node.ports == p ? 'selected' : ''}>${p} Puertos</option>`).join('')}
              </select>
            </div>
          ` : ''}

          ${node.type !== 'ONT' ? `
            <div>
              <label class="text-[10px] text-slate-400 block mb-1 flex items-center justify-between">
                <span>Reserva Técnica en Nodo (Coca)</span>
                <span class="text-amber-400 font-mono">+${node.reserveMeters || 0} m</span>
              </label>
              <input type="number" min="0" max="500" step="5" value="${node.reserveMeters || 0}" onchange="updateNodeProp('${node.id}', 'reserveMeters', Number(this.value))"
                     class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono" />
            </div>
          ` : ''}
        </div>

        ${isSpliceable ? `
          <button onclick="openSpliceModal('${node.id}')" class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/15 flex items-center justify-center gap-2 transition">
            <i class="fa-solid fa-fire-flame-curved"></i>
            <span>Gestionar Fusiones e Hilos (${node.splices?.length || 0})</span>
          </button>
        ` : ''}

        <button onclick="deleteSelected()" class="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center justify-center gap-2 transition">
          <i class="fa-solid fa-trash-can"></i> Eliminar Elemento
        </button>
      </div>
    `;
  } else if (appState.selectedItem.kind === 'cable') {
    const cable = appState.cables.find(c => c.id === appState.selectedItem.id);
    if (!cable) return;
    badge.textContent = 'CABLE FO';
    const routeM = calculateCableRouteMeters(cable);
    const totalM = routeM + Number(cable.reserveMeters || 0);

    container.innerHTML = `
      <div class="space-y-4">
        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2.5">
          <div>
            <label class="text-[10px] uppercase tracking-wider text-slate-400 block mb-1">Identificador de Tramo</label>
            <input type="text" value="${cable.name}" onchange="updateCableProp('${cable.id}', 'name', this.value)"
                   class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium" />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Tipo de Tendido</label>
              <select onchange="updateCableProp('${cable.id}', 'type', this.value)" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white">
                <option value="troncal" ${cable.type === 'troncal' ? 'selected' : ''}>Troncal</option>
                <option value="distribucion" ${cable.type === 'distribucion' ? 'selected' : ''}>Distribución</option>
                <option value="drop" ${cable.type === 'drop' ? 'selected' : ''}>Drop</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 block mb-1">Capacidad (Hilos)</label>
              <select onchange="updateCableProp('${cable.id}', 'cores', Number(this.value))" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono">
                ${[1, 2, 4, 6, 12, 24, 48, 96, 144].map(c => `<option value="${c}" ${cable.cores == c ? 'selected' : ''}>${c} Hilos</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-3">
          <div class="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
            <i class="fa-solid fa-route"></i> Recorrido, Curvas y Reservas
          </div>

          <div class="grid grid-cols-3 gap-1.5 text-center font-mono">
            <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <div class="text-[9px] text-slate-400">TRAZADO</div>
              <div class="text-xs font-bold text-slate-200">${routeM} m</div>
            </div>
            <div class="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <div class="text-[9px] text-slate-400">RESERVA</div>
              <div class="text-xs font-bold text-amber-400">+${cable.reserveMeters || 0} m</div>
            </div>
            <div class="bg-slate-900 p-2 rounded-lg border border-cyan-500/30">
              <div class="text-[9px] text-cyan-400">TOTAL ÓPTICO</div>
              <div class="text-xs font-bold text-cyan-300">${totalM} m</div>
            </div>
          </div>

          <div>
            <label class="text-[10px] text-slate-400 block mb-1">Reserva Técnica del Tramo (Cocas en m)</label>
            <input type="number" min="0" max="1000" step="5" value="${cable.reserveMeters || 0}" onchange="updateCableProp('${cable.id}', 'reserveMeters', Number(this.value))"
                   class="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono" />
          </div>

          <div class="flex items-center justify-between pt-1">
            <span class="text-[11px] text-slate-400">Vértices / Curvas: <strong class="text-white font-mono">${cable.waypoints?.length || 0}</strong></span>
            <button onclick="addMidpointToCable('${cable.id}')" class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] border border-slate-700">
              <i class="fa-solid fa-plus mr-1"></i> Añadir Vértice
            </button>
          </div>
          <p class="text-[10px] text-slate-500">Arrastra los puntos naranjas en el mapa para moldear curvas o esquinas de calle.</p>
        </div>

        <div class="bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div class="text-[11px] font-semibold text-slate-300 mb-2">Hilos del Cable (TIA-598-C)</div>
          <div class="max-h-36 overflow-y-auto space-y-1 pr-1">
            ${Array.from({ length: Math.min(cable.cores, 24) }, (_, i) => {
              const fc = getFiberColor(i + 1);
              return `
                <div class="flex items-center justify-between text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-800/80">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full shrink-0" style="background:${fc.hex}; border:1px solid rgba(255,255,255,0.25)"></span>
                    <span class="font-mono text-slate-300">Hilo #${i + 1} (${fc.name})</span>
                  </div>
                  <span class="text-[9px] font-mono text-slate-500">Tubo ${fc.tube}</span>
                </div>
              `;
            }).join('')}
            ${cable.cores > 24 ? `<div class="text-[10px] text-center text-slate-500 pt-1">... y ${cable.cores - 24} hilos más</div>` : ''}
          </div>
        </div>

        <button onclick="deleteSelected()" class="w-full py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-medium flex items-center justify-center gap-2 transition">
          <i class="fa-solid fa-trash-can"></i> Eliminar Tramo de Fibra
        </button>
      </div>
    `;
  }
}

function updateNodeProp(nodeId, prop, value) {
  const node = appState.nodes.find(n => n.id === nodeId);
  if (!node) return;
  node[prop] = value;
  renderAll();
}

function updateCableProp(cableId, prop, value) {
  const cable = appState.cables.find(c => c.id === cableId);
  if (!cable) return;
  cable[prop] = value;
  renderAll();
}

function addMidpointToCable(cableId) {
  const cable = appState.cables.find(c => c.id === cableId);
  if (!cable) return;
  const pts = getCablePoints(cable);
  const mid = getPolylineMidpoint(pts);
  cable.waypoints = cable.waypoints || [];
  cable.waypoints.push({ x: Math.round(mid.x), y: Math.round(mid.y - 35) });
  renderAll();
  showToast('Vértice añadido: arrástralo en el mapa para ajustar la trayectoria', 'info');
}

function deleteSelected() {
  if (!appState.selectedItem) return;
  if (appState.selectedItem.kind === 'node') {
    const id = appState.selectedItem.id;
    appState.nodes = appState.nodes.filter(n => n.id !== id);
    appState.cables = appState.cables.filter(c => c.fromNodeId !== id && c.toNodeId !== id);
  } else if (appState.selectedItem.kind === 'cable') {
    const id = appState.selectedItem.id;
    appState.cables = appState.cables.filter(c => c.id !== id);
  }
  appState.selectedItem = null;
  renderAll();
  showToast('Elemento eliminado del proyecto', 'info');
}
