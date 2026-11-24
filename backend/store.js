const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost')
    ? false
    : { rejectUnauthorized: false }
});

async function getProjects() {
  const { rows } = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.updated_at AS "updatedAt",
      COUNT(DISTINCT n.id)::int AS "nodesCount",
      COUNT(DISTINCT c.id)::int AS "cablesCount"
    FROM projects p
    LEFT JOIN nodes n ON n.project_id = p.id
    LEFT JOIN cables c ON c.project_id = p.id
    GROUP BY p.id, p.name, p.updated_at
    ORDER BY p.updated_at DESC
  `);
  return rows;
}

async function getProjectById(id) {
  const projRes = await pool.query(
    `SELECT id, name, scale_meters_per_grid, gis_lat, gis_lng, updated_at FROM projects WHERE id = $1`,
    [id]
  );
  if (projRes.rows.length === 0) return null;

  const p = projRes.rows[0];

  const nodesRes = await pool.query(
    `SELECT id, type, name, x, y, reserve_meters, ports, tx_power, splitter, sensitivity FROM nodes WHERE project_id = $1`,
    [id]
  );

  const cablesRes = await pool.query(
    `SELECT id, name, type, cores, from_node_id, to_node_id, waypoints_json, reserve_meters FROM cables WHERE project_id = $1`,
    [id]
  );

  const nodeIds = nodesRes.rows.map(n => n.id);
  let splicesByNode = {};

  if (nodeIds.length > 0) {
    const splicesRes = await pool.query(
      `SELECT id, node_id, from_endpoint_json, to_endpoint_json FROM splices WHERE node_id = ANY($1::varchar[])`,
      [nodeIds]
    );
    for (const sp of splicesRes.rows) {
      if (!splicesByNode[sp.node_id]) splicesByNode[sp.node_id] = [];
      splicesByNode[sp.node_id].push({
        id: sp.id,
        from: JSON.parse(sp.from_endpoint_json),
        to: JSON.parse(sp.to_endpoint_json)
      });
    }
  }

  const nodes = nodesRes.rows.map(n => ({
    id: n.id,
    type: n.type,
    name: n.name,
    x: Number(n.x),
    y: Number(n.y),
    reserveMeters: Number(n.reserve_meters || 0),
    ports: Number(n.ports || 8),
    txPower: Number(n.tx_power ?? 5.0),
    splitter: n.splitter || 'none',
    sensitivity: Number(n.sensitivity ?? -27.0),
    splices: splicesByNode[n.id] || []
  }));

  const cables = cablesRes.rows.map(c => ({
    id: c.id,
    name: c.name,
    type: c.type,
    cores: Number(c.cores || 12),
    fromNodeId: c.from_node_id,
    toNodeId: c.to_node_id,
    waypoints: c.waypoints_json ? JSON.parse(c.waypoints_json) : [],
    reserveMeters: Number(c.reserve_meters || 0)
  }));

  return {
    id: p.id,
    name: p.name,
    scaleMetersPerGrid: Number(p.scale_meters_per_grid || 50),
    gisOrigin: {
      lat: Number(p.gis_lat ?? -8.111600),
      lng: Number(p.gis_lng ?? -79.028700)
    },
    nodes,
    cables,
    updatedAt: p.updated_at
  };
}

async function saveProject(id, payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const name = payload.name || 'Proyecto FTTH';
    const scaleMetersPerGrid = Number(payload.scaleMetersPerGrid || 50);
    const gisLat = Number(payload.gisOrigin?.lat ?? -8.111600);
    const gisLng = Number(payload.gisOrigin?.lng ?? -79.028700);
    const nodes = Array.isArray(payload.nodes) ? payload.nodes : [];
    const cables = Array.isArray(payload.cables) ? payload.cables : [];

    await client.query(
      `
      INSERT INTO projects (id, name, scale_meters_per_grid, gis_lat, gis_lng, updated_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        scale_meters_per_grid = EXCLUDED.scale_meters_per_grid,
        gis_lat = EXCLUDED.gis_lat,
        gis_lng = EXCLUDED.gis_lng,
        updated_at = CURRENT_TIMESTAMP
      `,
      [id, name, scaleMetersPerGrid, gisLat, gisLng]
    );

    // Limpiamos nodos y cables anteriores del proyecto para guardar el estado actual limpio
    await client.query(`DELETE FROM cables WHERE project_id = $1`, [id]);
    await client.query(`DELETE FROM nodes WHERE project_id = $1`, [id]);

    for (const n of nodes) {
      await client.query(
        `
        INSERT INTO nodes (id, project_id, type, name, x, y, reserve_meters, ports, tx_power, splitter, sensitivity)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          n.id,
          id,
          n.type,
          n.name,
          Math.round(Number(n.x || 0)),
          Math.round(Number(n.y || 0)),
          Number(n.reserveMeters || 0),
          Number(n.ports || 8),
          Number(n.txPower ?? 5.0),
          n.splitter || 'none',
          Number(n.sensitivity ?? -27.0)
        ]
      );

      const nodeSplices = Array.isArray(n.splices) ? n.splices : [];
      for (const sp of nodeSplices) {
        await client.query(
          `
          INSERT INTO splices (id, node_id, from_endpoint_json, to_endpoint_json)
          VALUES ($1, $2, $3, $4)
          `,
          [
            sp.id,
            n.id,
            JSON.stringify(sp.from || {}),
            JSON.stringify(sp.to || {})
          ]
        );
      }
    }

    for (const c of cables) {
      await client.query(
        `
        INSERT INTO cables (id, project_id, name, type, cores, from_node_id, to_node_id, waypoints_json, reserve_meters)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          c.id,
          id,
          c.name,
          c.type,
          Number(c.cores || 12),
          c.fromNodeId,
          c.toNodeId,
          JSON.stringify(c.waypoints || []),
          Number(c.reserveMeters || 0)
        ]
      );
    }

    await client.query('COMMIT');
    return await getProjectById(id);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function deleteProject(id) {
  const res = await pool.query(`DELETE FROM projects WHERE id = $1 RETURNING id`, [id]);
  return res.rowCount > 0;
}



module.exports = { getProjects, getProjectById, saveProject, deleteProject };