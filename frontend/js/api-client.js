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

  async saveProjectToServer(projectId = 'proj_demo_01') {
    try {
      const res = await fetch(`${this.baseUrl}/projects/${projectId}`, {
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
      showToast('Proyecto sincronizado en la nube', 'success');
      return await res.json();
    } catch {
      showToast('Servidor remoto no conectado: guardado local en JSON disponible', 'info');
      return null;
    }
  }
};
