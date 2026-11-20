/**
 * Vista de Diagrama Unifilar automático y vista de Presupuesto Óptico + Metrado BOM.
 */
function renderSingleLineDiagram(opticalMap = computeOpticalNetwork()) {
  const container = document.getElementById('unifilar-container');

  if (appState.nodes.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-500 mt-20">No hay elementos en la red para generar el diagrama unifilar.</div>`;
    return;
  }

  const rankMap = { OLT: 0, ODF: 1, MUFA: 2, SPLITTER: 2, POSTE: 2, NAP: 3, ONT: 4 };
  const columns = [[], [], [], [], []];

  appState.nodes.forEach(n => {
    const r = rankMap[n.type] ?? 2;
    columns[r].push(n);
  });

  const colWidth = 270;
  const rowHeight = 140;
  const startX = 60;
  const startY = 60;

  const nodePositions = {};
  let maxRows = 1;

  columns.forEach((colNodes, cIdx) => {
    if (colNodes.length > maxRows) maxRows = colNodes.length;
    colNodes.forEach((n, rIdx) => {
      nodePositions[n.id] = {
        x: startX + cIdx * colWidth,
        y: startY + rIdx * rowHeight
      };
    });
  });

  const svgW = Math.max(1200, startX * 2 + 5 * colWidth);
  const svgH = Math.max(540, startY * 2 + maxRows * rowHeight);

  const linesHtml = appState.cables.map(cab => {
    const p1 = nodePositions[cab.fromNodeId];
    const p2 = nodePositions[cab.toNodeId];
    if (!p1 || !p2) return '';

    const x1 = p1.x + 170;
    const y1 = p1.y + 38;
    const x2 = p2.x;
    const y2 = p2.y + 38;
    const midX = (x1 + x2) / 2;

    const routeM = calculateCableRouteMeters(cab);
    const totalM = routeM + Number(cab.reserveMeters || 0);
    const color = cab.type === 'troncal' ? '#a855f7' : cab.type === 'drop' ? '#10b981' : '#38bdf8';

    return `
      <g>
        <path d="M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}"
              fill="none" stroke="${color}" stroke-width="2.5" />
        <rect x="${midX - 42}" y="${(y1 + y2) / 2 - 11}" width="84" height="22" rx="5" fill="#0f172a" stroke="${color}" stroke-width="1" />
        <text x="${midX}" y="${(y1 + y2) / 2 + 3}" text-anchor="middle" fill="#f8fafc" font-size="9.5" font-family="JetBrains Mono">
          ${cab.cores}H &bull; ${totalM}m
        </text>
      </g>
    `;
  }).join('');

  const blocksHtml = appState.nodes.map(n => {
    const pos = nodePositions[n.id];
    if (!pos) return '';
    const spec = NODE_CATALOG[n.type] || NODE_CATALOG.POSTE;
    const opt = opticalMap[n.id];
    const sig = getSignalStatusBadge(opt?.rxPower);

    let subDetail = n.type;
    if (n.type === 'OLT') subDetail = `${n.ports} PON &bull; TX +${n.txPower} dBm`;
    else if (n.splitter && n.splitter !== 'none') subDetail = `Splitter ${n.splitter}`;
    else if (n.reserveMeters) subDetail = `Reserva: ${n.reserveMeters}m`;

    return `
      <g transform="translate(${pos.x}, ${pos.y})" class="cursor-pointer" onclick="openSpliceModal('${n.id}')">
        <rect x="0" y="0" width="170" height="76" rx="10" fill="#0f172a" stroke="${spec.color}" stroke-width="2" />
        <rect x="0" y="0" width="170" height="24" rx="8" fill="${spec.color}" fill-opacity="0.22" />
        <text x="10" y="16" fill="#ffffff" font-size="11" font-family="Inter" font-weight="700">${n.name}</text>

        <text x="10" y="40" fill="#94a3b8" font-size="10" font-family="JetBrains Mono">${subDetail}</text>

        <rect x="10" y="49" width="150" height="19" rx="4" fill="#090d16" />
        <text x="85" y="62" text-anchor="middle" fill="${sig.color}" font-size="10" font-family="JetBrains Mono" font-weight="bold">
          ${opt ? (n.type === 'OLT' ? `Salida: +${opt.rxPower} dBm` : `RX: ${opt.rxPower} dBm (${opt.totalDistMeters}m)`) : 'Sin Señal Óptica'}
        </text>
      </g>
    `;
  }).join('');

  const headers = ['1. CABECERA (OLT)', '2. DISTRIBUCIÓN (ODF)', '3. TRONCAL / MUFA', '4. ACCESO (NAP/CTO)', '5. CLIENTES (ONT)'];
  const headersHtml = headers.map((h, i) => `
    <text x="${startX + i * colWidth + 85}" y="28" text-anchor="middle" fill="#64748b" font-size="11" font-family="JetBrains Mono" font-weight="bold">${h}</text>
  `).join('');

  container.innerHTML = `
    <svg width="${svgW}" height="${svgH}" class="mx-auto">
      ${headersHtml}
      ${linesHtml}
      ${blocksHtml}
    </svg>
  `;
}

function renderBudgetAndBOM(opticalMap = computeOpticalNetwork()) {
  const wavelength = document.getElementById('wavelength-select').value;
  document.getElementById('budget-wavelength-badge').textContent = `${wavelength} nm (${FIBER_ATTENUATION_DB_KM[wavelength]} dB/km)`;

  let totalRouteM = 0;
  let totalCableResM = 0;
  appState.cables.forEach(c => {
    totalRouteM += calculateCableRouteMeters(c);
    totalCableResM += Number(c.reserveMeters || 0);
  });
  const totalNodeResM = appState.nodes.reduce((acc, n) => acc + Number(n.reserveMeters || 0), 0);
  const totalFiberM = totalRouteM + totalCableResM + totalNodeResM;
  const totalSplices = appState.nodes.reduce((acc, n) => acc + (n.splices?.length || 0), 0);

  const napsAndOnts = appState.nodes.filter(n => n.type === 'NAP' || n.type === 'ONT');
  const activeLinks = napsAndOnts.filter(n => opticalMap[n.id] && opticalMap[n.id].rxPower >= -27.0).length;

  document.getElementById('engineering-kpi-cards').innerHTML = `
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div class="text-xs text-slate-400 mb-1">Metrado Total de Fibra (Inc. Reservas)</div>
      <div class="text-2xl font-mono font-bold text-cyan-400">${totalFiberM.toLocaleString()} m</div>
      <div class="text-[11px] text-slate-500 mt-1">Tendido: ${totalRouteM}m &bull; Reservas: ${totalCableResM + totalNodeResM}m</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div class="text-xs text-slate-400 mb-1">Enlaces Ópticos Activos (NAP/ONT)</div>
      <div class="text-2xl font-mono font-bold text-emerald-400">${activeLinks} / ${napsAndOnts.length}</div>
      <div class="text-[11px] text-slate-500 mt-1">Umbral sensibilidad GPON: -27.0 dBm</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div class="text-xs text-slate-400 mb-1">Fusiones y Empalmes Totales</div>
      <div class="text-2xl font-mono font-bold text-purple-400">${totalSplices}</div>
      <div class="text-[11px] text-slate-500 mt-1">Pérdida est. por fusión: ${SPLICE_LOSS_DB} dB</div>
    </div>
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div class="text-xs text-slate-400 mb-1">Elementos Pasivos de Planta</div>
      <div class="text-2xl font-mono font-bold text-amber-400">${appState.nodes.length}</div>
      <div class="text-[11px] text-slate-500 mt-1">${appState.cables.length} tramos de cable registrados</div>
    </div>
  `;

  const targetNodes = appState.nodes.filter(n => n.type !== 'OLT' && n.type !== 'POSTE');
  document.getElementById('power-budget-tbody').innerHTML = targetNodes.map(n => {
    const opt = opticalMap[n.id];
    const sig = getSignalStatusBadge(opt?.rxPower);

    return `
      <tr class="hover:bg-slate-800/40 transition">
        <td class="py-3 px-4 font-sans font-semibold text-slate-200">${n.name} <span class="text-[10px] text-slate-500">(${n.type})</span></td>
        <td class="py-3 px-4 font-sans text-slate-400">OLT Principal</td>
        <td class="py-3 px-4 text-right text-slate-300">${opt ? `${opt.totalDistMeters} m` : '&mdash;'}</td>
        <td class="py-3 px-4 text-center text-purple-300">${opt && opt.splitChain.length ? opt.splitChain.join(' &rarr; ') : '1:1'}</td>
        <td class="py-3 px-4 text-right text-slate-400">${opt ? `${opt.splicesCount}F / ${opt.connectorsCount}C` : '&mdash;'}</td>
        <td class="py-3 px-4 text-right text-amber-300">${opt ? `${opt.totalLoss} dB` : '&mdash;'}</td>
        <td class="py-3 px-4 text-right font-bold" style="color:${sig.color}">${opt ? `${opt.rxPower} dBm` : 'Sin Luz'}</td>
        <td class="py-3 px-4 text-center">
          <span class="px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${sig.bg}">${sig.status}</span>
        </td>
      </tr>
    `;
  }).join('');

  const counts = {
    OLT: appState.nodes.filter(n => n.type === 'OLT').length,
    ODF: appState.nodes.filter(n => n.type === 'ODF').length,
    MUFA: appState.nodes.filter(n => n.type === 'MUFA').length,
    NAP: appState.nodes.filter(n => n.type === 'NAP').length,
    POSTE: appState.nodes.filter(n => n.type === 'POSTE').length,
    ONT: appState.nodes.filter(n => n.type === 'ONT').length,
  };

  const splittersCount = {};
  appState.nodes.forEach(n => {
    if (n.splitter && n.splitter !== 'none') {
      splittersCount[n.splitter] = (splittersCount[n.splitter] || 0) + 1;
    }
  });

  const bomRows = [
    { item: 'Chasis OLT GPON / XGS-PON', spec: 'Incluye módulos SFP Clase B+/C+', qty: `${counts.OLT} und` },
    { item: 'Distribuidor Óptico ODF Rack 19"', spec: 'Bandejas + Acopladores SC/APC', qty: `${counts.ODF} und` },
    { item: 'Mufa / Cierre de Empalme Domo (FOSC)', spec: 'IP68 hasta 96 fusiones + Herraje', qty: `${counts.MUFA} und` },
    { item: 'Caja Terminal Óptica NAP / CTO', spec: 'Exterior IP65 con adaptadores SC/APC', qty: `${counts.NAP} und` },
    { item: 'Mangas Termocontraíbles de Fusión', spec: '60mm con varilla de acero inox.', qty: `${totalSplices + 10} und` },
    { item: 'Postes / Puntos de Apoyo y Crucetas', spec: 'Incluye herrajes de retención/suspensión', qty: `${counts.POSTE} und` },
    { item: 'Terminal de Abonado ONT + Roseta', spec: 'Dual Band Wi-Fi + Patchcord 3m', qty: `${counts.ONT} und` },
    ...Object.entries(splittersCount).map(([ratio, q]) => ({
      item: `Splitter Óptico ${ratio}`,
      spec: 'Conectorizado SC/APC Mini-módulo',
      qty: `${q} und`
    }))
  ];

  document.getElementById('bom-hardware-tbody').innerHTML = bomRows.map(r => `
    <tr class="hover:bg-slate-800/40">
      <td class="py-2.5 px-4 font-medium text-slate-200">${r.item}</td>
      <td class="py-2.5 px-4 text-slate-400">${r.spec}</td>
      <td class="py-2.5 px-4 text-right font-mono font-bold text-cyan-300">${r.qty}</td>
    </tr>
  `).join('');

  document.getElementById('bom-cables-tbody').innerHTML = appState.cables.map(c => {
    const routeM = calculateCableRouteMeters(c);
    const resM = Number(c.reserveMeters || 0);
    const totalWithSlack = Math.ceil((routeM + resM) * 1.05);
    return `
      <tr class="hover:bg-slate-800/40">
        <td class="py-2.5 px-4 font-sans text-slate-200">${c.name}</td>
        <td class="py-2.5 px-4 text-slate-400 uppercase">${c.type} (${c.cores}H)</td>
        <td class="py-2.5 px-4 text-right text-slate-300">${routeM} m</td>
        <td class="py-2.5 px-4 text-right text-amber-400">+${resM} m</td>
        <td class="py-2.5 px-4 text-right font-bold text-emerald-300">${totalWithSlack} m</td>
      </tr>
    `;
  }).join('');
}

function copyBOMToClipboard() {
  const rows = Array.from(document.querySelectorAll('#bom-hardware-tbody tr')).map(tr =>
    Array.from(tr.children).map(td => td.textContent.trim()).join('\t')
  ).join('\n');
  const textarea = document.createElement('textarea');
  textarea.value = `ÍTEM\tESPECIFICACIÓN\tCANTIDAD\n${rows}`;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  showToast('Tabla BOM copiada al portapapeles (lista para pegar en Excel)', 'success');
}
