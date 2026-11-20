const express = require('express');
const cors = require('cors');
const { getProjects, getProjectById, saveProject } = require('./store');
const { computeOpticalBudget } = require('./opticalService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'FiberCAD FTTH Backend API', timestamp: new Date().toISOString() });
});

app.get('/api/projects', (req, res) => {
  res.json(getProjects());
});

app.get('/api/projects/:id', (req, res) => {
  const project = getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }
  res.json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const saved = saveProject(req.params.id, req.body);
  res.json({ ok: true, project: saved });
});

app.post('/api/optical/budget', (req, res) => {
  const { nodes = [], cables = [], wavelength = '1490', scaleMetersPerGrid = 50, gridSizePx = 50 } = req.body;
  const result = computeOpticalBudget({ nodes, cables, wavelength, scaleMetersPerGrid, gridSizePx });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`FiberCAD FTTH Backend corriendo en puerto ${PORT}`);
});
