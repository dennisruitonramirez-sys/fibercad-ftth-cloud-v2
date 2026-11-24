const express = require('express');
const cors = require('cors');
const { getProjects, getProjectById, saveProject, deleteProject } = require('./store');
const { computeOpticalBudget } = require('./opticalService');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'FiberCAD FTTH Backend API', timestamp: new Date().toISOString() });
});

app.get('/api/projects', async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener proyectos' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al consultar el proyecto' });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const saved = await saveProject(req.params.id, req.body);
    res.json({ ok: true, project: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar el proyecto' });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const deleted = await deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }
    res.json({ ok: true, id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar el proyecto' });
  }
});

app.post('/api/optical/budget', (req, res) => {
  const { nodes = [], cables = [], wavelength = '1490', scaleMetersPerGrid = 50, gridSizePx = 50 } = req.body;
  const result = computeOpticalBudget({ nodes, cables, wavelength, scaleMetersPerGrid, gridSizePx });
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`FiberCAD FTTH Backend corriendo en puerto ${PORT}`);
});