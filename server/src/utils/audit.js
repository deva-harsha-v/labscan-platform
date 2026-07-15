import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';

export const AuditAction = Object.freeze({
  USER_CREATED: 'USER_CREATED',
  USER_DELETED: 'USER_DELETED',
  LAB_CREATED: 'LAB_CREATED',
  LAB_UPDATED: 'LAB_UPDATED',
  LAB_DELETED: 'LAB_DELETED',
  EXPERIMENT_CREATED: 'EXPERIMENT_CREATED',
  EXPERIMENT_UPDATED: 'EXPERIMENT_UPDATED',
  EXPERIMENT_DELETED: 'EXPERIMENT_DELETED',
  MARKER_REASSIGNED: 'MARKER_REASSIGNED',
  CONTENT_VERSION_CREATED: 'CONTENT_VERSION_CREATED',
});

/**
 * Append an entry to the audit log. Never throws into the request path —
 * a failed audit write is logged but does not fail the underlying action.
 * Pass `conn` to participate in an existing transaction.
 */
export async function recordAudit(
  { actorId, action, targetType = null, targetId = null, details = null },
  conn = null,
) {
  const sql = `INSERT INTO audit_logs (log_id, actor_id, action_type, target_type, target_id, details)
               VALUES (:logId, :actorId, :action, :targetType, :targetId, :details)`;
  const params = {
    logId: uuidv4(),
    actorId: actorId ?? null,
    action,
    targetType,
    targetId,
    details: details ? JSON.stringify(details) : null,
  };
  try {
    if (conn) {
      await conn.execute(sql, params);
    } else {
      await query(sql, params);
    }
  } catch (err) {
     
    console.error('Failed to write audit log:', err.message);
  }
}
