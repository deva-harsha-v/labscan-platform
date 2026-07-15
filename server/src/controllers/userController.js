import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { notFound, conflict } from '../utils/errors.js';
import { recordAudit, AuditAction } from '../utils/audit.js';

export const createStudentSchema = z.object({
  username: z.string().min(3).max(255),
  password: z.string().min(8).max(255),
});

function publicUser(u) {
  return {
    id: u.user_id,
    username: u.username,
    role: u.role,
    createdAt: u.created_at,
  };
}

/**
 * Admin creates a student account. Only 'student' accounts can be created here;
 * admin accounts are provisioned out-of-band (seed / ops).
 */
export async function createStudent(req, res) {
  const { username, password } = req.body;

  const existing = await query('SELECT user_id FROM users WHERE username = :username LIMIT 1', {
    username,
  });
  if (existing.length) throw conflict('Username already taken');

  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  await query(
    `INSERT INTO users (user_id, username, password_hash, role)
     VALUES (:id, :username, :passwordHash, 'student')`,
    { id, username, passwordHash },
  );

  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.USER_CREATED,
    targetType: 'user',
    targetId: id,
    details: { username, role: 'student' },
  });

  const rows = await query(
    'SELECT user_id, username, role, created_at FROM users WHERE user_id = :id',
    { id },
  );
  res.status(201).json({ user: publicUser(rows[0]) });
}

export async function listStudents(_req, res) {
  const rows = await query(
    `SELECT user_id, username, role, created_at
     FROM users WHERE role = 'student' ORDER BY created_at DESC`,
  );
  res.json({ students: rows.map(publicUser) });
}

export async function getUser(req, res) {
  const rows = await query(
    'SELECT user_id, username, role, created_at FROM users WHERE user_id = :id LIMIT 1',
    { id: req.params.id },
  );
  if (!rows[0]) throw notFound('User not found');
  res.json({ user: publicUser(rows[0]) });
}

export async function deleteStudent(req, res) {
  const { id } = req.params;
  const rows = await query('SELECT user_id, username, role FROM users WHERE user_id = :id LIMIT 1', {
    id,
  });
  if (!rows[0]) throw notFound('User not found');
  if (rows[0].role !== 'student') throw conflict('Only student accounts can be deleted here');

  await query('DELETE FROM users WHERE user_id = :id', { id });

  await recordAudit({
    actorId: req.user.id,
    action: AuditAction.USER_DELETED,
    targetType: 'user',
    targetId: id,
    details: { username: rows[0].username },
  });

  res.status(204).end();
}
