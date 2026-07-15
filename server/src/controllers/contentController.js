import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query, withTransaction } from '../config/db.js';
import { notFound, badRequest, conflict } from '../utils/errors.js';
import { recordAudit, AuditAction } from '../utils/audit.js';
import { theoryProcedureSchema, videoLinksSchema } from '../schemas/content.js';
import { getSignedUploadUrl, isStorageConfigured } from '../utils/storage.js';

export const createContentVersionSchema = z.object({
  theoryProcedure: theoryProcedureSchema,
  videoLinks: videoLinksSchema.optional().default([]),
  checklistItems: z
    .array(z.string().min(1).max(2000))
    .max(200)
    .optional()
    .default([]),
});

export const uploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().max(255).optional(),
});

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toVersion(row, checklistItems = undefined) {
  return {
    id: row.content_version_id,
    experimentId: row.experiment_id,
    versionNumber: row.version_number,
    theoryProcedure: parseJson(row.theory_procedure_json, []),
    videoLinks: parseJson(row.video_links, []),
    createdAt: row.created_at,
    ...(checklistItems ? { checklistItems } : {}),
  };
}

/**
 * Creates a new immutable content version and makes it the experiment's active
 * version. Existing sessions keep their snapshot (content versioning).
 */
export async function createContentVersion(req, res) {
  const { id: experimentId } = req.params;
  const experiment = await query(
    'SELECT experiment_id, experiment_name FROM experiments WHERE experiment_id = :id LIMIT 1',
    { id: experimentId },
  );
  if (!experiment[0]) throw notFound('Experiment not found');

  const { theoryProcedure, videoLinks, checklistItems } = req.body;

  // Enforce unique video_id values so per-video progress keys stay unambiguous.
  const videoIds = new Set();
  for (const v of videoLinks) {
    if (videoIds.has(v.video_id)) throw badRequest(`Duplicate video_id: ${v.video_id}`);
    videoIds.add(v.video_id);
  }

  const versionId = await withTransaction(async (conn) => {
    const [maxRows] = await conn.execute(
      'SELECT COALESCE(MAX(version_number), 0) AS max FROM experiment_content_versions WHERE experiment_id = :id',
      { id: experimentId },
    );
    const nextVersion = Number(maxRows[0].max) + 1;
    const contentVersionId = uuidv4();

    await conn.execute(
      `INSERT INTO experiment_content_versions
         (content_version_id, experiment_id, version_number, theory_procedure_json, video_links)
       VALUES (:id, :experimentId, :versionNumber, :theory, :videos)`,
      {
        id: contentVersionId,
        experimentId,
        versionNumber: nextVersion,
        theory: JSON.stringify(theoryProcedure),
        videos: JSON.stringify(videoLinks),
      },
    );

    for (let i = 0; i < checklistItems.length; i += 1) {
      await conn.execute(
        `INSERT INTO checklist_items (checklist_item_id, content_version_id, item_text, item_order)
         VALUES (:id, :versionId, :text, :order)`,
        { id: uuidv4(), versionId: contentVersionId, text: checklistItems[i], order: i },
      );
    }

    await conn.execute(
      'UPDATE experiments SET active_content_version_id = :versionId WHERE experiment_id = :experimentId',
      { versionId: contentVersionId, experimentId },
    );

    await recordAudit(
      {
        actorId: req.user.id,
        action: AuditAction.CONTENT_VERSION_CREATED,
        targetType: 'experiment',
        targetId: experimentId,
        details: { versionNumber: nextVersion, contentVersionId },
      },
      conn,
    );

    return contentVersionId;
  });

  const rows = await query(
    'SELECT * FROM experiment_content_versions WHERE content_version_id = :id',
    { id: versionId },
  );
  const checklist = await query(
    'SELECT checklist_item_id, item_text, item_order FROM checklist_items WHERE content_version_id = :id ORDER BY item_order',
    { id: versionId },
  );
  res.status(201).json({
    contentVersion: toVersion(
      rows[0],
      checklist.map((c) => ({ id: c.checklist_item_id, text: c.item_text, order: c.item_order })),
    ),
  });
}

export async function listContentVersions(req, res) {
  const { id: experimentId } = req.params;
  const rows = await query(
    'SELECT * FROM experiment_content_versions WHERE experiment_id = :id ORDER BY version_number DESC',
    { id: experimentId },
  );
  res.json({ contentVersions: rows.map((r) => toVersion(r)) });
}

export async function getContentVersion(req, res) {
  const { id } = req.params;
  const rows = await query(
    'SELECT * FROM experiment_content_versions WHERE content_version_id = :id LIMIT 1',
    { id },
  );
  if (!rows[0]) throw notFound('Content version not found');
  const checklist = await query(
    'SELECT checklist_item_id, item_text, item_order FROM checklist_items WHERE content_version_id = :id ORDER BY item_order',
    { id },
  );
  res.json({
    contentVersion: toVersion(
      rows[0],
      checklist.map((c) => ({ id: c.checklist_item_id, text: c.item_text, order: c.item_order })),
    ),
  });
}

/**
 * Admin preview of an experiment's current active content.
 */
export async function getActiveContent(req, res) {
  const { id: experimentId } = req.params;
  const exp = await query(
    'SELECT active_content_version_id FROM experiments WHERE experiment_id = :id LIMIT 1',
    { id: experimentId },
  );
  if (!exp[0]) throw notFound('Experiment not found');
  if (!exp[0].active_content_version_id) throw notFound('Experiment has no content yet');

  req.params.id = exp[0].active_content_version_id;
  return getContentVersion(req, res);
}

/**
 * Issue a signed PUT URL so admins can upload faculty-recorded media directly
 * to object storage. Returns the storage_key to embed in a video_link.
 */
export async function createUploadUrl(req, res) {
  if (!isStorageConfigured()) {
    throw conflict('Object storage is not configured on this server');
  }
  const { filename, contentType } = req.body;
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `faculty-videos/${uuidv4()}-${safe}`;
  const uploadUrl = await getSignedUploadUrl(storageKey, contentType);
  res.json({ uploadUrl, storageKey });
}
