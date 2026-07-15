import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import ContentBlocks from '../../components/ContentBlocks.jsx';
import VideoTimer from '../../components/VideoTimer.jsx';

const STAGES = ['Learning', 'Visual', 'Checklist', 'Complete'];

function currentStage(session) {
  if (session.completedAt) return 3;
  if (!session.stages.learningCompletedAt) return 0;
  if (!session.stages.visualCompletedAt) return 1;
  return 2;
}

export default function SessionPage() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api
      .get(`/student/sessions/${id}`)
      .then((d) => setSession(d.session))
      .catch((e) => setError(e.message || 'Failed to load session'));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const reportProgress = useCallback(
    (videoId, watchedSeconds) => {
      api
        .post(`/student/sessions/${id}/video-progress`, { videoId, watchedSeconds })
        .catch(() => {});
    },
    [id],
  );

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <Link to="/student">← Back to dashboard</Link>
      </div>
    );
  }
  if (!session) return <div className="container">Loading session…</div>;

  const stage = currentStage(session);

  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.details ? formatUnmet(e) : e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container">
      <Link to="/student" className="muted">
        ← Dashboard
      </Link>
      <h2>{session.experiment.name}</h2>
      <div className="muted">Content version v{session.versionNumber}</div>

      <div className="stepper">
        {STAGES.map((s, i) => (
          <div key={s} className={`step ${i === stage ? 'active' : ''} ${i < stage ? 'done' : ''}`}>
            {i < stage ? '✓ ' : ''}
            {s}
          </div>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {stage === 0 && (
        <LearningStage session={session} busy={busy} onComplete={() =>
          act(() => api.post(`/student/sessions/${id}/learning-complete`))
        } />
      )}

      {stage === 1 && (
        <VisualStage
          session={session}
          busy={busy}
          onProgress={reportProgress}
          onComplete={() => act(() => api.post(`/student/sessions/${id}/visual-complete`))}
        />
      )}

      {stage === 2 && (
        <ChecklistStage
          session={session}
          busy={busy}
          onToggle={(itemId, isCompleted) =>
            act(() => api.patch(`/student/sessions/${id}/checklist/${itemId}`, { isCompleted }))
          }
          onComplete={() => act(() => api.post(`/student/sessions/${id}/complete`))}
        />
      )}

      {stage === 3 && <CompletionScreen session={session} />}
    </div>
  );
}

function formatUnmet(err) {
  if (Array.isArray(err.details)) {
    const parts = err.details.map((d) => `${d.videoId}: ${d.watched}/${d.required}s`);
    return `${err.message} — ${parts.join(', ')}`;
  }
  return err.message;
}

function LearningStage({ session, busy, onComplete }) {
  return (
    <div>
      <div className="card">
        <h3>Learning stage</h3>
        <ContentBlocks blocks={session.theoryProcedure} />
      </div>
      <button onClick={onComplete} disabled={busy}>
        Mark learning complete →
      </button>
    </div>
  );
}

function VisualStage({ session, busy, onProgress, onComplete }) {
  const allMet = session.videos.every((v) => v.watchedSeconds >= v.minDuration);
  return (
    <div>
      <h3>Visual stage</h3>
      <p className="muted">
        Watch each video for the minimum time. The timer pauses if you switch tabs.
      </p>
      {session.videos.length === 0 && <p className="muted">No videos for this experiment.</p>}
      {session.videos.map((v) => (
        <VideoTimer key={v.videoId} video={v} onProgress={onProgress} />
      ))}
      <button onClick={onComplete} disabled={busy || (session.videos.length > 0 && !allMet)}>
        Complete visual stage →
      </button>
    </div>
  );
}

function ChecklistStage({ session, busy, onToggle, onComplete }) {
  const allDone = session.checklist.length > 0 && session.checklist.every((c) => c.isCompleted);
  return (
    <div>
      <div className="card">
        <h3>Checklist</h3>
        {session.checklist.length === 0 && <p className="muted">No checklist items.</p>}
        {session.checklist.map((item) => (
          <label key={item.id} className="checklist-item">
            <input
              type="checkbox"
              checked={item.isCompleted}
              disabled={busy}
              onChange={(e) => onToggle(item.id, e.target.checked)}
            />
            <span>{item.text}</span>
          </label>
        ))}
      </div>
      <button onClick={onComplete} disabled={busy || !allDone}>
        Finish experiment →
      </button>
    </div>
  );
}

function CompletionScreen({ session }) {
  return (
    <div className="card completion">
      <div className="check">✓</div>
      <h2>Experiment complete!</h2>
      <p className="muted">
        You finished all stages of <strong>{session.experiment.name}</strong>. Show this screen to
        your faculty for verification.
      </p>
      <p className="muted">Completed at {new Date(session.completedAt).toLocaleString()}</p>
      <Link to="/student" className="btn">
        Back to dashboard
      </Link>
    </div>
  );
}
