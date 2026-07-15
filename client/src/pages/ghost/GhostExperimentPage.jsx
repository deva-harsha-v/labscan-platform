import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client.js';
import ContentBlocks from '../../components/ContentBlocks.jsx';

function youtubeEmbed(url) {
  try {
    const u = new URL(url);
    const id = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : u.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export default function GhostExperimentPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/ghost/experiments/${id}`, { auth: false })
      .then(setData)
      .catch(() => setError('Failed to load experiment'));
  }, [id]);

  if (error) return <div className="container error">{error}</div>;
  if (!data) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <Link to="/ghost" className="muted">
        ← Back to browse
      </Link>
      <h2>{data.experiment.name}</h2>
      {data.experiment.description && <p className="muted">{data.experiment.description}</p>}

      <div className="card">
        <h3>Theory &amp; Procedure</h3>
        <ContentBlocks blocks={data.theoryProcedure} />
      </div>

      {data.videos.length > 0 && (
        <div className="card">
          <h3>Videos</h3>
          {data.videos.map((v) => {
            const embed = v.type === 'youtube' ? youtubeEmbed(v.url) : null;
            return (
              <div key={v.videoId} style={{ marginBottom: 16 }}>
                <strong>{v.title || v.videoId}</strong>
                {embed ? (
                  <iframe
                    title={v.videoId}
                    width="100%"
                    height="315"
                    src={embed}
                    allowFullScreen
                    style={{ border: 0, borderRadius: 8, marginTop: 8 }}
                  />
                ) : v.url ? (
                  <video src={v.url} controls width="100%" style={{ borderRadius: 8, marginTop: 8 }} />
                ) : (
                  <p className="muted">Video unavailable.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
