import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { notFound } from '../utils/errors.js';
import { recordAudit, AuditAction } from '../utils/audit.js';

export const createLabSchema = z.object({
  labName: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
});

export const updateLabSchema = createLabSchema.partial();

function toLab(row) {
  return {
    id: row.lab_id,
    labName: row.lab_name,
    description: row.description,
    adminId: row.admin_id,
    experimentCount: row.experiment_count ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createLab(req, res) {
  const { labName, description = null } = req.body;
  const id = uuidv4();
  await query(
    `INSERT INTO labs (lab_id, lab_name, description, admin_id)
     VALUES (:id, :labName, :description, :adminId)`,
    { id, labName, description, adminId: req.user.id },
  );
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.LAB_CREATED,
    targetType: 'lab',
    targetId: id,
    details: { labName },
  });
  const rows = await query('SELECT * FROM labs WHERE lab_id = :id', { id });
  res.status(201).json({ lab: toLab(rows[0]) });
}

export async function listLabs(_req, res) {
  const rows = await query(
    `SELECT l.*, COUNT(e.experiment_id) AS experiment_count
     FROM labs l
     LEFT JOIN experiments e ON e.lab_id = l.lab_id
     GROUP BY l.lab_id
     ORDER BY l.created_at DESC`,
  );
  res.json({ labs: rows.map(toLab) });
}

export async function getLab(req, res) {
  const rows = await query('SELECT * FROM labs WHERE lab_id = :id LIMIT 1', { id: req.params.id });
  if (!rows[0]) throw notFound('Lab not found');
  res.json({ lab: toLab(rows[0]) });
}

export async function updateLab(req, res) {
  const { id } = req.params;
  const existing = await query('SELECT * FROM labs WHERE lab_id = :id LIMIT 1', { id });
  if (!existing[0]) throw notFound('Lab not found');

  const labName = req.body.labName ?? existing[0].lab_name;
  const description = req.body.description ?? existing[0].description;
  await query('UPDATE labs SET lab_name = :labName, description = :description WHERE lab_id = :id', {
    id,
    labName,
    description,
  });
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.LAB_UPDATED,
    targetType: 'lab',
    targetId: id,
    details: req.body,
  });
  const rows = await query('SELECT * FROM labs WHERE lab_id = :id', { id });
  res.json({ lab: toLab(rows[0]) });
}

export async function deleteLab(req, res) {
  const { id } = req.params;
  const existing = await query('SELECT lab_id, lab_name FROM labs WHERE lab_id = :id LIMIT 1', {
    id,
  });
  if (!existing[0]) throw notFound('Lab not found');
  await query('DELETE FROM labs WHERE lab_id = :id', { id });
  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.LAB_DELETED,
    targetType: 'lab',
    targetId: id,
    details: { labName: existing[0].lab_name },
  });
  res.status(204).end();
}
