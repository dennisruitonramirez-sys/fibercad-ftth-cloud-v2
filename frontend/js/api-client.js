const FiberApiClient = {
  baseUrl: window.FIBERCAD_API_URL || 'http://localhost:4000/api',

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },

  async listProjects() {
    try {
      const res = await fetch(`${this.baseUrl}/projects`);
      if (!res.ok) throw new Error('Error al listar proyectos');
      return await res.json();
    } catch {
      return [];
    }
  },

  async loadProjectFromServer(projectId) {
    if (!projectId) return null;
    try {
      const res = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(projectId)}`);
      if (!res.ok) throw new Error('Proyecto no encontrado en el servidor');
      const project = await res.json();

      appState.projectId = project.id;
      appState.projectName = project.name || 'Proyecto FTTH';
      appState.scaleMetersPerGrid = project.scaleMetersPerGrid || 50;
      if (project.gisOrigin) appState.gisOrigin = project.gisOrigin;
      appState.nodes = project.nodes || [];
      appState.cables = project.cables || [];
      appState.selectedItem = null;
      appState.drawingCable = null;

      const subtitle = document.getElementById('project-subtitle');
      if (subtitle) subtitle.textContent = `Proyecto: ${appState.projectName}`;

      const scaleInput = document.getElementById('scale-meters-per-grid');
      if (scaleInput) scaleInput.value = appState.scaleMetersPerGrid;

      renderAll();
      await refreshCloudProjectsDropdown(project.id);
      showToast(`Proyecto "${appState.projectName}" cargado desde la nube`, 'success');
      return project;
    } catch {
      showToast('No se pudo cargar el proyecto desde el servidor', 'warning');
      return null;
    }
  },

  async saveProjectToServer(projectId = appState.projectId || 'proj_demo_01') {
    const cleanId = (projectId || 'proj_demo_01').trim();
    appState.projectId = cleanId;

    try {
      const res = await fetch(`${this.baseUrl}/projects/${encodeURIComponent(cleanId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: appState.projectName,
          scaleMetersPerGrid: appState.scaleMetersPerGrid,
          gisOrigin: appState.gisOrigin,
          nodes: appState.nodes,
          cables: appState.cables
        })
      });
      if (!res.ok) throw new Error('Error en respuesta del servidor');
      await refreshCloudProjectsDropdown(cleanId);
      showToast(`Proyecto "${appState.projectName}" guardado en la nube (${cleanId})`, 'success');
      return await res.json();
    } catch {
      showToast('Servidor remoto no conectado: guardado local en JSON disponible', 'info');
      return null;
    }
  }
};