import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { notFound } from '../utils/errors.js';
import { recordAudit, AuditAction } from '../utils/audit.js';

export const createExperimentSchema = z.object({
  experimentName: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  markerId: z.string().min(1).max(255),
});

export const updateExperimentSchema = z
  .object({
    experimentName: z.string().min(1).max(255),
    description: z.string().max(5000).nullable(),
  })
  .partial();

export const reassignMarkerSchema = z.object({
  markerId: z.string().min(1).max(255),
});

function toExperiment(row) {
  return {
    id: row.experiment_id,
    labId: row.lab_id,
    experimentName: row.experiment_name,
    description: row.description,
    markerId: row.ar_qr_marker_id,
    activeContentVersionId: row.active_content_version_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createExperiment(req, res) {
  const { labId } = req.params;
  const lab = await query('SELECT lab_id FROM labs WHERE lab_id = :labId LIMIT 1', { labId });
  if (!lab[0]) throw notFound('Lab not found');

  const { experimentName, description = null, markerId } = req.body;
  const id = uuidv4();
  await query(
    `INSERT INTO experiments (experiment_id, lab_id, experiment_name, description, ar_qr_marker_id)
     VALUES (:id, :labId, :experimentName, :description, :markerId)`,
    { id, labId, experimentName, description, markerId },
  );
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.EXPERIMENT_CREATED,
    targetType: 'experiment',
    targetId: id,
    details: { experimentName, markerId },
  });
  const rows = await query('SELECT * FROM experiments WHERE experiment_id = :id', { id });
  res.status(201).json({ experiment: toExperiment(rows[0]) });
}

export async function listExperimentsByLab(req, res) {
  const { labId } = req.params;
  const rows = await query(
    'SELECT * FROM experiments WHERE lab_id = :labId ORDER BY created_at DESC',
    { labId },
  );
  res.json({ experiments: rows.map(toExperiment) });
}

export async function getExperiment(req, res) {
  const rows = await query('SELECT * FROM experiments WHERE experiment_id = :id LIMIT 1', {
    id: req.params.id,
  });
  if (!rows[0]) throw notFound('Experiment not found');
  res.json({ experiment: toExperiment(rows[0]) });
}

export async function updateExperiment(req, res) {
  const { id } = req.params;
  const existing = await query('SELECT * FROM experiments WHERE experiment_id = :id LIMIT 1', { id });
  if (!existing[0]) throw notFound('Experiment not found');

  const experimentName = req.body.experimentName ?? existing[0].experiment_name;
  const description = req.body.description ?? existing[0].description;
  await query(
    'UPDATE experiments SET experiment_name = :experimentName, description = :description WHERE experiment_id = :id',
    { id, experimentName, description },
  );
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.EXPERIMENT_UPDATED,
    targetType: 'experiment',
    targetId: id,
    details: req.body,
  });
  const rows = await query('SELECT * FROM experiments WHERE experiment_id = :id', { id });
  res.json({ experiment: toExperiment(rows[0]) });
}

export async function deleteExperiment(req, res) {
  const { id } = req.params;
  const existing = await query(
    'SELECT experiment_id, experiment_name FROM experiments WHERE experiment_id = :id LIMIT 1',
    { id },
  );
  if (!existing[0]) throw notFound('Experiment not found');
  await query('DELETE FROM experiments WHERE experiment_id = :id', { id });
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.EXPERIMENT_DELETED,
    targetType: 'experiment',
    targetId: id,
    details: { experimentName: existing[0].experiment_name },
  });
  res.status(204).end();
}

export async function reassignMarker(req, res) {
  const { id } = req.params;
  const { markerId } = req.body;
  const existing = await query(
    'SELECT experiment_id, ar_qr_marker_id FROM experiments WHERE experiment_id = :id LIMIT 1',
    { id },
  );
  if (!existing[0]) throw notFound('Experiment not found');

  const previous = existing[0].ar_qr_marker_id;
  await query('UPDATE experiments SET ar_qr_marker_id = :markerId WHERE experiment_id = :id', {
    id,
    markerId,
  });
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.MARKER_REASSIGNED,
    targetType: 'experiment',
    targetId: id,
    details: { previousMarker: previous, newMarker: markerId },
  });
  const rows = await query('SELECT * FROM experiments WHERE experiment_id = :id', { id });
  res.json({ experiment: toExperiment(rows[0]) });
}

/**
 * Resolve a scanned marker to an experiment plus this student's session status.
 * Used right after an ArUco/QR scan, before starting a session.
 */
export async function resolveMarker(req, res) {
  const { marker } = req.params;
  const rows = await query(
    `SELECT e.experiment_id, e.experiment_name, e.description, e.active_content_version_id,
            e.lab_id, l.lab_name,
            s.session_id, s.session_completed_at
     FROM experiments e
     JOIN labs l ON l.lab_id = e.lab_id
     LEFT JOIN student_sessions s
        ON s.experiment_id = e.experiment_id AND s.student_id = :studentId
     WHERE e.ar_qr_marker_id = :marker LIMIT 1`,
    { marker, studentId: req.user.id },
  );
  if (!rows[0]) throw notFound('No experiment for that marker');
  const r = rows[0];
  let status = 'not_started';
  if (r.session_id) status = r.session_completed_at ? 'completed' : 'in_progress';
  res.json({
    experiment: {
      id: r.experiment_id,
      experimentName: r.experiment_name,
      description: r.description,
      labId: r.lab_id,
      labName: r.lab_name,
      hasContent: Boolean(r.active_content_version_id),
    },
    sessionId: r.session_id || null,
    status,
  });
}

/**
 * Student dashboard: all experiments with this student's session status
 * (not_started / in_progress / completed).
 */
export async function listExperimentsForStudent(req, res) {
  const rows = await query(
    `SELECT e.experiment_id, e.experiment_name, e.description, e.ar_qr_marker_id,
            e.lab_id, l.lab_name,
            e.active_content_version_id,
            s.session_id, s.session_completed_at
     FROM experiments e
     JOIN labs l ON l.lab_id = e.lab_id
     LEFT JOIN student_sessions s
        ON s.experiment_id = e.experiment_id AND s.student_id = :studentId
     ORDER BY l.lab_name, e.experiment_name`,
    { studentId: req.user.id },
  );

  const experiments = rows.map((r) => {
    let status = 'not_started';
    if (r.session_id) status = r.session_completed_at ? 'completed' : 'in_progress';
    return {
      id: r.experiment_id,
      experimentName: r.experiment_name,
      description: r.description,
      markerId: r.ar_qr_marker_id,
      labId: r.lab_id,
      labName: r.lab_name,
      hasContent: Boolean(r.active_content_version_id),
      sessionId: r.session_id || null,
      status,
    };
  });
  res.json({ experiments });
}
