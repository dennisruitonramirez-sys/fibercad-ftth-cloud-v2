/**
 * Estándares y catálogos de ingeniería óptica FTTH:
 * - Código de colores TIA-598-C (1 a 12)
 * - Pérdidas de inserción de splitters PLC y FBT
 * - Atenuación kilométrica ITU-T G.652.D
 * - Catálogo de nodos y parámetros base
 */
const TIA_598_COLORS = [
  { index: 1,  name: 'Azul',    hex: '#2563eb', text: '#ffffff' },
  { index: 2,  name: 'Naranja', hex: '#f97316', text: '#ffffff' },
  { index: 3,  name: 'Verde',   hex: '#16a34a', text: '#ffffff' },
  { index: 4,  name: 'Marrón',  hex: '#92400e', text: '#ffffff' },
  { index: 5,  name: 'Gris',    hex: '#64748b', text: '#ffffff' },
  { index: 6,  name: 'Blanco',  hex: '#f8fafc', text: '#0f172a' },
  { index: 7,  name: 'Rojo',    hex: '#dc2626', text: '#ffffff' },
  { index: 8,  name: 'Negro',   hex: '#1e293b', text: '#f8fafc', border: '#475569' },
  { index: 9,  name: 'Amarillo',hex: '#eab308', text: '#0f172a' },
  { index: 10, name: 'Violeta', hex: '#9333ea', text: '#ffffff' },
  { index: 11, name: 'Rosa',    hex: '#ec4899', text: '#ffffff' },
  { index: 12, name: 'Aqua',    hex: '#06b6d4', text: '#0f172a' }
];

const SPLITTER_SPECS = {
  'none':  { label: 'Sin Splitter (Paso Directo)', ports: 0, loss: 0, unbalanced: false },
  '1:2':   { label: 'PLC Balanceado 1:2', ports: 2,  loss: 3.7,  unbalanced: false },
  '1:4':   { label: 'PLC Balanceado 1:4', ports: 4,  loss: 7.3,  unbalanced: false },
  '1:8':   { label: 'PLC Balanceado 1:8', ports: 8,  loss: 10.5, unbalanced: false },
  '1:16':  { label: 'PLC Balanceado 1:16', ports: 16, loss: 13.7, unbalanced: false },
  '1:32':  { label: 'PLC Balanceado 1:32', ports: 32, loss: 17.1, unbalanced: false },
  '1:64':  { label: 'PLC Balanceado 1:64', ports: 64, loss: 20.5, unbalanced: false },
  '10/90': { label: 'FBT Desbalanceado 10/90 (Tap/Paso)', ports: 2, lossTap: 10.6, lossPass: 0.7, unbalanced: true },
  '20/80': { label: 'FBT Desbalanceado 20/80 (Tap/Paso)', ports: 2, lossTap: 7.5,  lossPass: 1.2, unbalanced: true },
  '30/70': { label: 'FBT Desbalanceado 30/70 (Tap/Paso)', ports: 2, lossTap: 5.7,  lossPass: 1.8, unbalanced: true }
};

const FIBER_ATTENUATION_DB_KM = {
  '1310': 0.35,
  '1490': 0.25,
  '1550': 0.20
};

const SPLICE_LOSS_DB = 0.08;
const CONNECTOR_LOSS_DB = 0.40;

const NODE_CATALOG = {
  OLT:      { label: 'OLT',       color: '#6366f1', icon: '\uf233', defaultPorts: 8, txPower: 5.0 },
  ODF:      { label: 'ODF',       color: '#3b82f6', icon: '\uf828', trays: 2 },
  MUFA:     { label: 'Mufa FOSC', color: '#a855f7', icon: '\uf46b', trays: 4 },
  NAP:      { label: 'Caja NAP',  color: '#10b981', icon: '\uf49e', defaultPorts: 8 },
  SPLITTER: { label: 'Splitter',  color: '#f59e0b', icon: '\uf126', defaultRatio: '1:8' },
  POSTE:    { label: 'Poste',     color: '#64748b', icon: '\uf519' },
  ONT:      { label: 'ONT',       color: '#06b6d4', icon: '\ue012', sensitivity: -27.0 }
};
