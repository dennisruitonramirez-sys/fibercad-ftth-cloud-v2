const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.store.json');

function readStore() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { projects: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function getProjects() {
  const store = readStore();
  return Object.values(store.projects).map(p => ({
    id: p.id,
    name: p.name,
    nodesCount: (p.nodes || []).length,
    cablesCount: (p.cables || []).length,
    updatedAt: p.updatedAt
  }));
}

function getProjectById(id) {
  const store = readStore();
  return store.projects[id] || null;
}

function saveProject(id, payload) {
  const store = readStore();
  const project = {
    id,
    name: payload.name || 'Proyecto FTTH',
    scaleMetersPerGrid: payload.scaleMetersPerGrid || 50,
    gisOrigin: payload.gisOrigin || { lat: -8.111600, lng: -79.028700 },
    nodes: payload.nodes || [],
    cables: payload.cables || [],
    updatedAt: new Date().toISOString()
  };
  store.projects[id] = project;
  writeStore(store);
  return project;
}

module.exports = { getProjects, getProjectById, saveProject };
