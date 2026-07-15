import { query } from '../config/db.js';
import { notFound } from '../utils/errors.js';
import { getSignedDownloadUrl } from '../utils/storage.js';

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Ghost mode returns Learning-stage content only: theory/procedure blocks and
 * playable videos. No timers, checklists, sessions, or persistence.
 */
async function buildGhostContent(experimentRow) {
  const versionRows = await query(
    'SELECT * FROM experiment_content_versions WHERE content_version_id = :id',
    { id: experimentRow.active_content_version_id },
  );
  const version = versionRows[0];

  const videos = await Promise.all(
    parseJson(version?.video_links, []).map(async (v) => {
      const base = { videoId: v.video_id, type: v.type, title: v.title ?? null };
      if (v.type === 'faculty') {
        // Serve a short-lived signed URL instead of a permanent direct link.
        const url = await getSignedDownloadUrl(v.storage_key);
        return { ...base, url };
      }
      return { ...base, url: v.url };
    }),
  );

  return {
    experiment: {
      id: experimentRow.experiment_id,
      name: experimentRow.experiment_name,
      description: experimentRow.description,
    },
    theoryProcedure: parseJson(version?.theory_procedure_json, []),
    videos,
  };
}

export async function listGhostExperiments(_req, res) {
  const rows = await query(
    `SELECT e.experiment_id, e.experiment_name, e.description, l.lab_name
     FROM experiments e
     JOIN labs l ON l.lab_id = e.lab_id
     WHERE e.active_content_version_id IS NOT NULL
     ORDER BY l.lab_name, e.experiment_name`,
  );
  res.json({
    experiments: rows.map((r) => ({
      id: r.experiment_id,
      experimentName: r.experiment_name,
      description: r.description,
      labName: r.lab_name,
    })),
  });
}

export async function getGhostExperiment(req, res) {
  const rows = await query(
    'SELECT * FROM experiments WHERE experiment_id = :id AND active_content_version_id IS NOT NULL LIMIT 1',
    { id: req.params.id },
  );
  if (!rows[0]) throw notFound('Experiment not found or has no content');
  res.json(await buildGhostContent(rows[0]));
}

export async function getGhostByMarker(req, res) {
  const rows = await query(
    'SELECT * FROM experiments WHERE ar_qr_marker_id = :marker AND active_content_version_id IS NOT NULL LIMIT 1',
    { marker: req.params.marker },
  );
  if (!rows[0]) throw notFound('No experiment for that marker');
  res.json(await buildGhostContent(rows[0]));
}
