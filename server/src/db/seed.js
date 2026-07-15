import { v4 as uuidv4 } from 'uuid';
import { query, closePool } from '../config/db.js';
import { hashPassword } from '../utils/password.js';
import { env } from '../config/env.js';

async function upsertUser(username, password, role) {
  const existing = await query('SELECT user_id FROM users WHERE username = :username', { username });
  if (existing[0]) return existing[0].user_id;
  const id = uuidv4();
  const passwordHash = await hashPassword(password);
  await query(
    'INSERT INTO users (user_id, username, password_hash, role) VALUES (:id, :username, :passwordHash, :role)',
    { id, username, passwordHash, role },
  );
  return id;
}

async function seed() {
  const adminId = await upsertUser(env.seed.adminUsername, env.seed.adminPassword, 'admin');
  const studentId = await upsertUser(env.seed.studentUsername, env.seed.studentPassword, 'student');

  // Sample lab + experiment + content version (idempotent by marker).
  const marker = 'ARUCO-DEMO-0001';
  const existingExp = await query(
    'SELECT experiment_id FROM experiments WHERE ar_qr_marker_id = :marker',
    { marker },
  );

  if (!existingExp[0]) {
    const labId = uuidv4();
    await query(
      'INSERT INTO labs (lab_id, lab_name, description, admin_id) VALUES (:id, :name, :desc, :adminId)',
      {
        id: labId,
        name: 'Physics Lab I',
        desc: 'Introductory mechanics and optics experiments.',
        adminId,
      },
    );

    const experimentId = uuidv4();
    await query(
      `INSERT INTO experiments (experiment_id, lab_id, experiment_name, description, ar_qr_marker_id)
       VALUES (:id, :labId, :name, :desc, :marker)`,
      {
        id: experimentId,
        labId,
        name: "Simple Pendulum — measuring 'g'",
        desc: 'Determine acceleration due to gravity using a simple pendulum.',
        marker,
      },
    );

    const versionId = uuidv4();
    const theory = [
      { type: 'heading', text: 'Aim' },
      { type: 'text', text: "To determine the acceleration due to gravity (g) using a simple pendulum." },
      { type: 'heading', text: 'Theory' },
      {
        type: 'text',
        text: 'For small oscillations, the time period T of a simple pendulum of length L is T = 2π√(L/g).',
      },
      { type: 'equation', latex: 'T = 2\\pi\\sqrt{\\frac{L}{g}}' },
      { type: 'warning', text: 'Keep the amplitude small (< 10°) so the small-angle approximation holds.' },
      { type: 'heading', text: 'Procedure' },
      { type: 'text', text: 'Measure the length, displace slightly, and time 20 oscillations. Repeat for several lengths.' },
    ];
    const videoLinks = [
      {
        video_id: 'yt-intro',
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        title: 'Simple Pendulum — concept',
        min_duration: 60,
      },
    ];
    await query(
      `INSERT INTO experiment_content_versions
         (content_version_id, experiment_id, version_number, theory_procedure_json, video_links)
       VALUES (:id, :experimentId, 1, :theory, :videos)`,
      {
        id: versionId,
        experimentId,
        theory: JSON.stringify(theory),
        videos: JSON.stringify(videoLinks),
      },
    );

    const checklist = [
      'Recorded pendulum length for each trial',
      'Timed 20 oscillations at least 3 times',
      'Calculated g and compared with 9.81 m/s²',
    ];
    for (let i = 0; i < checklist.length; i += 1) {
      await query(
        'INSERT INTO checklist_items (checklist_item_id, content_version_id, item_text, item_order) VALUES (:id, :versionId, :text, :order)',
        { id: uuidv4(), versionId, text: checklist[i], order: i },
      );
    }

    await query(
      'UPDATE experiments SET active_content_version_id = :versionId WHERE experiment_id = :experimentId',
      { versionId, experimentId },
    );
  }

   
  console.log('Seed complete.');
   
  console.log(`  admin:   ${env.seed.adminUsername} / ${env.seed.adminPassword}`);
   
  console.log(`  student: ${env.seed.studentUsername} / ${env.seed.studentPassword}`);
   
  console.log(`  demo marker: ${marker}`);
  void studentId;
}

seed()
  .catch((err) => {
     
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => closePool());
