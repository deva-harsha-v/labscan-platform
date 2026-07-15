import { z } from 'zod';
import { query } from '../config/db.js';

export const auditQuerySchema = z.object({
  actionType: z.string().max(100).optional(),
  actorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function listAuditLogs(req, res) {
  const { actionType, actorId, limit, offset } = req.query;

  const where = [];
  const params = {};
  if (actionType) {
    where.push('a.action_type = :actionType');
    params.actionType = actionType;
  }
  if (actorId) {
    where.push('a.actor_id = :actorId');
    params.actorId = actorId;
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // limit/offset are validated integers (zod), safe to inline. Prepared-statement
  // placeholders for LIMIT/OFFSET are unreliable across MySQL versions.
  const rows = await query(
    `SELECT a.log_id, a.actor_id, u.username AS actor_username, a.action_type,
            a.target_type, a.target_id, a.details, a.timestamp
     FROM audit_logs a
     LEFT JOIN users u ON u.user_id = a.actor_id
     ${whereSql}
     ORDER BY a.timestamp DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  res.json({
    logs: rows.map((r) => ({
      id: r.log_id,
      actorId: r.actor_id,
      actorUsername: r.actor_username,
      actionType: r.action_type,
      targetType: r.target_type,
      targetId: r.target_id,
      details: parseJson(r.details),
      timestamp: r.timestamp,
    })),
  });
}
