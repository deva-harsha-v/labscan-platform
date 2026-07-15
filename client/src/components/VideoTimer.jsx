import { useEffect, useRef, useState } from 'react';

function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
    else id = u.searchParams.get('v') || '';
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

/**
 * Plays a video and accumulates *active-tab* watch time toward a minimum timer.
 * The timer pauses when the tab is hidden (Page Visibility API) and resumes
 * when visible, enforcing genuine watch time rather than just logging.
 */
export default function VideoTimer({ video, onProgress }) {
  const [watched, setWatched] = useState(video.watchedSeconds || 0);
  const [tabHidden, setTabHidden] = useState(document.hidden);
  const watchedRef = useRef(video.watchedSeconds || 0);
  const lastReportedRef = useRef(video.watchedSeconds || 0);

  const met = watched >= video.minDuration;

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => {
      if (document.hidden) return;
      if (watchedRef.current >= video.minDuration) return;
      watchedRef.current += 1;
      setWatched(watchedRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, [video.minDuration]);

  // Report accumulated progress to the server every few seconds and on unmount.
  useEffect(() => {
    const report = () => {
      if (watchedRef.current !== lastReportedRef.current) {
        lastReportedRef.current = watchedRef.current;
        onProgress(video.videoId, watchedRef.current);
      }
    };
    const id = setInterval(report, 5000);
    return () => {
      clearInterval(id);
      report();
    };
  }, [video.videoId, onProgress]);

  const embed = video.type === 'youtube' ? youtubeEmbed(video.url) : null;
  const pct = Math.min(100, Math.round((watched / video.minDuration) * 100));

  return (
    <div className="card">
      <div className="spread">
        <strong>{video.title || video.videoId}</strong>
        <span className="badge badge-not_started">{video.type}</span>
      </div>

      {embed ? (
        <iframe
          title={video.videoId}
          width="100%"
          height="315"
          src={embed}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ border: 0, borderRadius: 8, marginTop: 10 }}
        />
      ) : video.url ? (
        <video src={video.url} controls width="100%" style={{ borderRadius: 8, marginTop: 10 }} />
      ) : (
        <p className="muted">Video unavailable (storage not configured).</p>
      )}

      {tabHidden && (
        <div className="tab-hidden-warning">Timer paused — return to this tab to keep watching.</div>
      )}

      <div className="timer-bar">
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="spread">
        <span className="muted">
          {watched}s / {video.minDuration}s watched
        </span>
        {met ? <span className="success">✓ minimum met</span> : <span className="muted">keep watching…</span>}
      </div>
    </div>
  );
}
