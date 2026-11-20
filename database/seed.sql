-- Datos iniciales de ejemplo para probar la base de datos y el API en la nube
INSERT INTO projects (id, name, scale_meters_per_grid, gis_lat, gis_lng)
VALUES ('proj_demo_01', 'Red Troncal & Distribución GPON — Sector Norte', 50, -8.111600, -79.028700)
ON CONFLICT (id) DO NOTHING;

INSERT INTO nodes (id, project_id, type, name, x, y, reserve_meters, ports, tx_power, splitter)
VALUES
  ('node_olt1', 'proj_demo_01', 'OLT', 'OLT-CENTRAL-01', 100, 240, 15, 8, 5.00, 'none'),
  ('node_odf1', 'proj_demo_01', 'ODF', 'ODF-CABECERA-01', 250, 240, 20, 8, 5.00, 'none'),
  ('node_p1', 'proj_demo_01', 'POSTE', 'POSTE-P01 (Reserva)', 420, 240, 30, 8, 5.00, 'none'),
  ('node_mufa1', 'proj_demo_01', 'MUFA', 'MUFA-TRONCAL-01', 580, 240, 25, 8, 5.00, '1:4'),
  ('node_nap1', 'proj_demo_01', 'NAP', 'NAP-N01 (16P)', 800, 120, 15, 8, 5.00, '1:8'),
  ('node_nap2', 'proj_demo_01', 'NAP', 'NAP-S02 (8P)', 800, 370, 15, 8, 5.00, '1:8'),
  ('node_ont1', 'proj_demo_01', 'ONT', 'ONT-CLI-101', 980, 70, 0, 1, 5.00, 'none'),
  ('node_ont2', 'proj_demo_01', 'ONT', 'ONT-CLI-102', 980, 170, 0, 1, 5.00, 'none'),
  ('node_ont3', 'proj_demo_01', 'ONT', 'ONT-CLI-201', 980, 370, 0, 1, 5.00, 'none')
ON CONFLICT (id) DO NOTHING;
