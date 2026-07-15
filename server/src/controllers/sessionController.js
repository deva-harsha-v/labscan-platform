import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { notFound, badRequest, conflict, forbidden } from '../utils/errors.js';
import { getSignedDownloadUrl } from '../utils/storage.js';

export const startSessionSchema = z.object({
  experimentId: z.string().uuid().optional(),
  markerId: z.string().min(1).max(255).optional(),
}).refine((v) => v.experimentId || v.markerId, {
  message: 'Provide experimentId or markerId',
});

export const videoProgressSchema = z.object({
  videoId: z.string().min(1).max(64),
  watchedSeconds: z.number().int().min(0).max(86400),
});

export const checklistToggleSchema = z.object({
  isCompleted: z.boolean(),
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

async function loadSessionForStudent(sessionId, studentId) {
  const rows = await query('SELECT * FROM student_sessions WHERE session_id = :id LIMIT 1', {
    id: sessionId,
  });
  const session = rows[0];
  if (!session) throw notFound('Session not found');
  if (session.student_id !== studentId) throw forbidden('Not your session');
  return session;
}

async function buildSessionPayload(session) {
  const versionRows = await query(
    'SELECT * FROM experiment_content_versions WHERE content_version_id = :id',
    { id: session.content_version_id },
  );
  const version = versionRows[0];

  const experimentRows = await query(
    'SELECT experiment_id, experiment_name, description FROM experiments WHERE experiment_id = :id',
    { id: session.experiment_id },
  );

  const checklistItems = await query(
    'SELECT checklist_item_id, item_text, item_order FROM checklist_items WHERE content_version_id = :id ORDER BY item_order',
    { id: session.content_version_id },
  );
  const progressRows = await query(
    'SELECT checklist_item_id, is_completed, completed_at FROM student_checklist_progress WHERE student_session_id = :id',
    { id: session.session_id },
  );
  const progressByItem = new Map(progressRows.map((p) => [p.checklist_item_id, p]));

  const videoProgress = parseJson(session.current_video_progress, {});

  // Strip storage keys from faculty videos; clients fetch signed URLs on demand.
  const videos = parseJson(version?.video_links, []).map((v) => {
    const base = {
      videoId: v.video_id,
      type: v.type,
      title: v.title ?? null,
      minDuration: v.min_duration,
      watchedSeconds: videoProgress[v.video_id]?.watchedSeconds ?? 0,
    };
    if (v.type === 'faculty') return { ...base, requiresSignedUrl: true };
    return { ...base, url: v.url };
  });

  return {
    id: session.session_id,
    experiment: {
      id: experimentRows[0]?.experiment_id,
      name: experimentRows[0]?.experiment_name,
      description: experimentRows[0]?.description,
    },
    contentVersionId: session.content_version_id,
    versionNumber: version?.version_number,
    theoryProcedure: parseJson(version?.theory_procedure_json, []),
    videos,
    checklist: checklistItems.map((c) => ({
      id: c.checklist_item_id,
      text: c.item_text,
      order: c.item_order,
      isCompleted: Boolean(progressByItem.get(c.checklist_item_id)?.is_completed),
      completedAt: progressByItem.get(c.checklist_item_id)?.completed_at ?? null,
    })),
    stages: {
      learningCompletedAt: session.learning_stage_completed_at,
      visualCompletedAt: session.visual_stage_completed_at,
      checklistCompletedAt: session.checklist_completed_at,
    },
    startedAt: session.session_started_at,
    completedAt: session.session_completed_at,
  };
}

/**
 * Start (or resume) a student's session for an experiment. Snapshots the
 * experiment's active content version so later admin edits don't affect it.
 */
export async function startSession(req, res) {
  const studentId = req.user.id;
  let { experimentId } = req.body;
  const { markerId } = req.body;

  if (!experimentId && markerId) {
    const exp = await query(
      'SELECT experiment_id FROM experiments WHERE ar_qr_marker_id = :markerId LIMIT 1',
      { markerId },
    );
    if (!exp[0]) throw notFound('No experiment for that marker');
    experimentId = exp[0].experiment_id;
  }

  const expRows = await query(
    'SELECT experiment_id, active_content_version_id FROM experiments WHERE experiment_id = :id LIMIT 1',
    { id: experimentId },
  );
  if (!expRows[0]) throw notFound('Experiment not found');
  if (!expRows[0].active_content_version_id) {
    throw conflict('Experiment has no published content yet');
  }

  // Resume if a session already exists (one per student per experiment).
  const existing = await query(
    'SELECT * FROM student_sessions WHERE student_id = :studentId AND experiment_id = :experimentId LIMIT 1',
    { studentId, experimentId },
  );
  if (existing[0]) {
    return res.status(200).json({ session: await buildSessionPayload(existing[0]), resumed: true });
  }

  const sessionId = uuidv4();
  const contentVersionId = expRows[0].active_content_version_id;
  await query(
    `INSERT INTO student_sessions (session_id, student_id, experiment_id, content_version_id, current_video_progress)
     VALUES (:id, :studentId, :experimentId, :contentVersionId, :progress)`,
    { id: sessionId, studentId, experimentId, contentVersionId, progress: JSON.stringify({}) },
  );

  const created = await query('SELECT * FROM student_sessions WHERE session_id = :id', {
    id: sessionId,
  });
  return res.status(201).json({ session: await buildSessionPayload(created[0]), resumed: false });
}

export async function listMySessions(req, res) {
  const rows = await query(
    `SELECT s.session_id, s.experiment_id, s.session_started_at, s.session_completed_at,
            s.learning_stage_completed_at, s.visual_stage_completed_at, s.checklist_completed_at,
            e.experiment_name, l.lab_name
     FROM student_sessions s
     JOIN experiments e ON e.experiment_id = s.experiment_id
     JOIN labs l ON l.lab_id = e.lab_id
     WHERE s.student_id = :studentId
     ORDER BY s.session_started_at DESC`,
    { studentId: req.user.id },
  );
  res.json({
    sessions: rows.map((r) => ({
      id: r.session_id,
      experimentId: r.experiment_id,
      experimentName: r.experiment_name,
      labName: r.lab_name,
      startedAt: r.session_started_at,
      completedAt: r.session_completed_at,
      status: r.session_completed_at ? 'completed' : 'in_progress',
    })),
  });
}

export async function getSession(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  res.json({ session: await buildSessionPayload(session) });
}

export async function completeLearningStage(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  if (!session.learning_stage_completed_at) {
    await query(
      'UPDATE student_sessions SET learning_stage_completed_at = NOW() WHERE session_id = :id',
      { id: session.session_id },
    );
  }
  const updated = await query('SELECT * FROM student_sessions WHERE session_id = :id', {
    id: session.session_id,
  });
  res.json({ session: await buildSessionPayload(updated[0]) });
}

/**
 * Accumulate reported watch time for a video (monotonic max). The client
 * pauses reporting when the tab is hidden (Page Visibility API), so this
 * reflects active-tab watch time only.
 */
export async function updateVideoProgress(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  const { videoId, watchedSeconds } = req.body;

  const version = await query(
    'SELECT video_links FROM experiment_content_versions WHERE content_version_id = :id',
    { id: session.content_version_id },
  );
  const videos = parseJson(version[0]?.video_links, []);
  const video = videos.find((v) => v.video_id === videoId);
  if (!video) throw badRequest('Unknown videoId for this session');

  const progress = parseJson(session.current_video_progress, {});
  const previous = progress[videoId]?.watchedSeconds ?? 0;
  progress[videoId] = { watchedSeconds: Math.max(previous, watchedSeconds) };

  await query(
    'UPDATE student_sessions SET current_video_progress = :progress WHERE session_id = :id',
    { id: session.session_id, progress: JSON.stringify(progress) },
  );
  res.json({ videoId, watchedSeconds: progress[videoId].watchedSeconds });
}

/**
 * Complete the Visual stage. Requires the Learning stage first and that every
 * video's accumulated watch time meets its minimum timer.
 */
export async function completeVisualStage(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  if (!session.learning_stage_completed_at) {
    throw conflict('Complete the Learning stage first');
  }

  const version = await query(
    'SELECT video_links FROM experiment_content_versions WHERE content_version_id = :id',
    { id: session.content_version_id },
  );
  const videos = parseJson(version[0]?.video_links, []);
  const progress = parseJson(session.current_video_progress, {});

  const unmet = videos
    .filter((v) => (progress[v.video_id]?.watchedSeconds ?? 0) < v.min_duration)
    .map((v) => ({
      videoId: v.video_id,
      required: v.min_duration,
      watched: progress[v.video_id]?.watchedSeconds ?? 0,
    }));
  if (unmet.length) {
    throw badRequest('Minimum watch time not met for all videos', unmet);
  }

  if (!session.visual_stage_completed_at) {
    await query(
      'UPDATE student_sessions SET visual_stage_completed_at = NOW() WHERE session_id = :id',
      { id: session.session_id },
    );
  }
  const updated = await query('SELECT * FROM student_sessions WHERE session_id = :id', {
    id: session.session_id,
  });
  res.json({ session: await buildSessionPayload(updated[0]) });
}

export async function toggleChecklistItem(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  const { itemId } = req.params;
  const { isCompleted } = req.body;

  const item = await query(
    'SELECT checklist_item_id FROM checklist_items WHERE checklist_item_id = :itemId AND content_version_id = :versionId LIMIT 1',
    { itemId, versionId: session.content_version_id },
  );
  if (!item[0]) throw notFound('Checklist item not in this session');

  await query(
    `INSERT INTO student_checklist_progress (student_session_id, checklist_item_id, is_completed, completed_at)
     VALUES (:sessionId, :itemId, :isCompleted, :completedAt)
     ON DUPLICATE KEY UPDATE is_completed = VALUES(is_completed), completed_at = VALUES(completed_at)`,
    {
      sessionId: session.session_id,
      itemId,
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
  );

  // Mark checklist stage complete once all items are checked.
  await syncChecklistStage(session.session_id, session.content_version_id);

  const updated = await query('SELECT * FROM student_sessions WHERE session_id = :id', {
    id: session.session_id,
  });
  res.json({ session: await buildSessionPayload(updated[0]) });
}

async function syncChecklistStage(sessionId, contentVersionId) {
  const totalRows = await query(
    'SELECT COUNT(*) AS total FROM checklist_items WHERE content_version_id = :versionId',
    { versionId: contentVersionId },
  );
  const doneRows = await query(
    'SELECT COUNT(*) AS done FROM student_checklist_progress WHERE student_session_id = :sessionId AND is_completed = TRUE',
    { sessionId },
  );
  const total = Number(totalRows[0].total);
  const done = Number(doneRows[0].done);
  const allDone = total > 0 && done >= total;
  await query(
    'UPDATE student_sessions SET checklist_completed_at = :ts WHERE session_id = :sessionId',
    { sessionId, ts: allDone ? new Date() : null },
  );
}

/**
 * Reach the completion screen. Requires all stages + checklist done. There is
 * no in-app submission or grading — completion is shown physically to faculty.
 */
export async function completeSession(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  if (!session.learning_stage_completed_at) throw conflict('Learning stage incomplete');
  if (!session.visual_stage_completed_at) throw conflict('Visual stage incomplete');
  if (!session.checklist_completed_at) throw conflict('Checklist incomplete');

  if (!session.session_completed_at) {
    await query('UPDATE student_sessions SET session_completed_at = NOW() WHERE session_id = :id', {
      id: session.session_id,
    });
  }
  const updated = await query('SELECT * FROM student_sessions WHERE session_id = :id', {
    id: session.session_id,
  });
  res.json({ session: await buildSessionPayload(updated[0]) });
}

/**
 * Issue a short-lived signed URL for a faculty-recorded video in this session.
 */
export async function getVideoSignedUrl(req, res) {
  const session = await loadSessionForStudent(req.params.id, req.user.id);
  const { videoId } = req.params;

  const version = await query(
    'SELECT video_links FROM experiment_content_versions WHERE content_version_id = :id',
    { id: session.content_version_id },
  );
  const videos = parseJson(version[0]?.video_links, []);
  const video = videos.find((v) => v.video_id === videoId);
  if (!video) throw notFound('Video not in this session');
  if (video.type !== 'faculty') throw badRequest('Video does not require a signed URL');

  const url = await getSignedDownloadUrl(video.storage_key);
  if (!url) throw conflict('Object storage is not configured on this server');
  res.json({ url });
}
