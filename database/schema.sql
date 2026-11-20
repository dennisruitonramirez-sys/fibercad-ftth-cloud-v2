-- Esquema de base de datos relacional (PostgreSQL / SQLite compatible)
-- Diseñado para persistir proyectos FTTH, nodos, cables, reservas y fusiones en la nube.

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  scale_meters_per_grid INT NOT NULL DEFAULT 50,
  gis_lat DECIMAL(10, 6) NOT NULL DEFAULT -8.111600,
  gis_lng DECIMAL(10, 6) NOT NULL DEFAULT -79.028700,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS nodes (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type VARCHAR(24) NOT NULL, -- OLT, ODF, MUFA, NAP, SPLITTER, POSTE, ONT
  name VARCHAR(100) NOT NULL,
  x INT NOT NULL,
  y INT NOT NULL,
  reserve_meters INT NOT NULL DEFAULT 0,
  ports INT DEFAULT 8,
  tx_power DECIMAL(5, 2) DEFAULT 5.00,
  splitter VARCHAR(20) DEFAULT 'none',
  sensitivity DECIMAL(5, 2) DEFAULT -27.00
);

CREATE TABLE IF NOT EXISTS cables (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(24) NOT NULL, -- troncal, distribucion, drop
  cores INT NOT NULL DEFAULT 24,
  from_node_id VARCHAR(64) NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  to_node_id VARCHAR(64) NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  waypoints_json TEXT NOT NULL DEFAULT '[]',
  reserve_meters INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS splices (
  id VARCHAR(64) PRIMARY KEY,
  node_id VARCHAR(64) NOT NULL REFERENCES nodes(id) ON DELETE CASCADE,
  from_endpoint_json TEXT NOT NULL,
  to_endpoint_json TEXT NOT NULL
);
