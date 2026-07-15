import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import AdminNav from './AdminNav.jsx';

const BLOCK_TYPES = ['heading', 'text', 'warning', 'equation', 'video_link'];

function emptyBlock(type) {
  if (type === 'equation') return { type, latex: '' };
  if (type === 'video_link') return { type, url: '', label: '' };
  return { type, text: '' };
}

let videoCounter = 0;
function emptyVideo() {
  videoCounter += 1;
  return { video_id: `vid-${Date.now()}-${videoCounter}`, type: 'youtube', url: '', title: '', min_duration: 60 };
}

export default function ContentEditorPage() {
  const { experimentId } = useParams();
  const [versions, setVersions] = useState([]);
  const [blocks, setBlocks] = useState([{ type: 'heading', text: 'Aim' }]);
  const [videos, setVideos] = useState([]);
  const [checklist, setChecklist] = useState(['']);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadVersions = () =>
    api
      .get(`/admin/experiments/${experimentId}/content-versions`)
      .then((d) => setVersions(d.contentVersions))
      .catch(() => {});

  useEffect(() => {
    loadVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experimentId]);

  // ---- block ops ----
  const addBlock = (type) => setBlocks([...blocks, emptyBlock(type)]);
  const updateBlock = (i, patch) =>
    setBlocks(blocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeBlock = (i) => setBlocks(blocks.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
  };

  // ---- video ops ----
  const updateVideo = (i, patch) => {
    setVideos(
      videos.map((v, idx) => {
        if (idx !== i) return v;
        const merged = { ...v, ...patch };
        if (patch.type) {
          merged.min_duration = patch.type === 'faculty' ? 300 : 60;
        }
        return merged;
      }),
    );
  };
  const removeVideo = (i) => setVideos(videos.filter((_, idx) => idx !== i));

  const publish = async () => {
    setError('');
    setMessage('');
    const theoryProcedure = blocks
      .map((b) => {
        if (b.type === 'equation') return { type: b.type, latex: b.latex };
        if (b.type === 'video_link') return { type: b.type, url: b.url, label: b.label || undefined };
        return { type: b.type, text: b.text };
      })
      .filter((b) => (b.type === 'equation' ? b.latex : b.type === 'video_link' ? b.url : b.text));

    const videoLinks = videos.map((v) =>
      v.type === 'faculty'
        ? { video_id: v.video_id, type: 'faculty', storage_key: v.storage_key || '', title: v.title || undefined, min_duration: Number(v.min_duration) }
        : { video_id: v.video_id, type: v.type, url: v.url, title: v.title || undefined, min_duration: Number(v.min_duration) },
    );
    const checklistItems = checklist.map((c) => c.trim()).filter(Boolean);

    try {
      const { contentVersion } = await api.post(
        `/admin/experiments/${experimentId}/content-versions`,
        { theoryProcedure, videoLinks, checklistItems },
      );
      setMessage(`Published version v${contentVersion.versionNumber}. Existing sessions keep their snapshot.`);
      loadVersions();
    } catch (err) {
      setError(err.details ? JSON.stringify(err.details) : err.message);
    }
  };

  return (
    <div className="container">
      <h2>Content editor</h2>
      <AdminNav />
      {error && <div className="error">{error}</div>}
      {message && <div className="success" style={{ marginBottom: 12 }}>{message}</div>}

      <div className="card">
        <div className="spread">
          <h3>Theory &amp; procedure blocks</h3>
        </div>
        {blocks.map((b, i) => (
          <div key={i} className="editor-block">
            <div className="spread">
              <strong>{b.type}</strong>
              <div className="row">
                <button className="btn-secondary btn-sm" onClick={() => move(i, -1)}>
                  ↑
                </button>
                <button className="btn-secondary btn-sm" onClick={() => move(i, 1)}>
                  ↓
                </button>
                <button className="btn-danger btn-sm" onClick={() => removeBlock(i)}>
                  ✕
                </button>
              </div>
            </div>
            {b.type === 'equation' ? (
              <input
                placeholder="LaTeX (e.g. T = 2\pi\sqrt{L/g})"
                value={b.latex}
                onChange={(e) => updateBlock(i, { latex: e.target.value })}
              />
            ) : b.type === 'video_link' ? (
              <>
                <input
                  placeholder="URL"
                  value={b.url}
                  onChange={(e) => updateBlock(i, { url: e.target.value })}
                />
                <input
                  placeholder="Label (optional)"
                  value={b.label}
                  onChange={(e) => updateBlock(i, { label: e.target.value })}
                />
              </>
            ) : (
              <textarea
                rows={b.type === 'heading' ? 1 : 3}
                value={b.text}
                onChange={(e) => updateBlock(i, { text: e.target.value })}
              />
            )}
          </div>
        ))}
        <div className="row" style={{ flexWrap: 'wrap' }}>
          {BLOCK_TYPES.map((t) => (
            <button key={t} className="btn-secondary btn-sm" onClick={() => addBlock(t)}>
              + {t}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Videos (Visual stage)</h3>
        <p className="muted">
          faculty = 300s min (needs storage key), youtube / virtual = 60s min.
        </p>
        {videos.map((v, i) => (
          <div key={v.video_id} className="editor-block">
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <select value={v.type} onChange={(e) => updateVideo(i, { type: e.target.value })} style={{ maxWidth: 140 }}>
                <option value="youtube">youtube</option>
                <option value="virtual">virtual</option>
                <option value="faculty">faculty</option>
              </select>
              <input
                placeholder="Title"
                value={v.title}
                onChange={(e) => updateVideo(i, { title: e.target.value })}
              />
              <input
                type="number"
                min={1}
                value={v.min_duration}
                onChange={(e) => updateVideo(i, { min_duration: e.target.value })}
                style={{ maxWidth: 110 }}
              />
              <button className="btn-danger btn-sm" onClick={() => removeVideo(i)}>
                ✕
              </button>
            </div>
            {v.type === 'faculty' ? (
              <input
                placeholder="storage_key (from upload)"
                value={v.storage_key || ''}
                onChange={(e) => updateVideo(i, { storage_key: e.target.value })}
              />
            ) : (
              <input
                placeholder="URL"
                value={v.url || ''}
                onChange={(e) => updateVideo(i, { url: e.target.value })}
              />
            )}
          </div>
        ))}
        <button className="btn-secondary btn-sm" onClick={() => setVideos([...videos, emptyVideo()])}>
          + video
        </button>
      </div>

      <div className="card">
        <h3>Checklist</h3>
        {checklist.map((c, i) => (
          <div key={i} className="row" style={{ marginBottom: 6 }}>
            <input
              value={c}
              placeholder={`Item ${i + 1}`}
              onChange={(e) => setChecklist(checklist.map((x, idx) => (idx === i ? e.target.value : x)))}
            />
            <button
              className="btn-danger btn-sm"
              onClick={() => setChecklist(checklist.filter((_, idx) => idx !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <button className="btn-secondary btn-sm" onClick={() => setChecklist([...checklist, ''])}>
          + item
        </button>
      </div>

      <button onClick={publish}>Publish new version</button>

      <div className="card" style={{ marginTop: 20 }}>
        <h3>Existing versions</h3>
        {versions.length === 0 ? (
          <p className="muted">No versions yet.</p>
        ) : (
          <ul>
            {versions.map((v) => (
              <li key={v.id}>
                v{v.versionNumber} — {new Date(v.createdAt).toLocaleString()} ({v.theoryProcedure.length}{' '}
                blocks, {v.videoLinks.length} videos)
              </li>
            ))}
          </ul>
        )}
      </div>

      <p style={{ marginTop: 16 }}>
        <Link to="/admin/labs" className="muted">
          ← Back to labs
        </Link>
      </p>
    </div>
  );
}
