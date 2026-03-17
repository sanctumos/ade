import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, createProject, listAgents } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

function normalizeProjects(data) {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.projects && Array.isArray(data.projects)) return data.projects;
  return [];
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [projectsSupported, setProjectsSupported] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listProjects()
      .then((data) => {
        if (!cancelled) setProjects(normalizeProjects(data));
      })
      .catch(() => {
        if (!cancelled) {
          setProjectsSupported(false);
          setProjects([]);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    createProject({ name: name.trim() })
      .then((proj) => {
        setProjects((prev) => [...prev, proj].filter(Boolean));
        setName('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  };

  if (loading) return <Loading message="Loading projects…" />;

  return (
    <div>
      <h1>Projects</h1>
      <p style={{ color: '#888', marginBottom: 24 }}>Group agents and work by project.</p>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />

      {projectsSupported ? (
        <form onSubmit={handleCreate} style={{ marginBottom: 24, display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: 240 }}
          />
          <button type="submit" disabled={creating}>Create project</button>
        </form>
      ) : (
        <p style={{ color: '#888', marginBottom: 24 }}>
          This backend does not expose <code>/v1/projects</code>. Projects are optional; you can use Agents and Chat directly.
        </p>
      )}

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {projects.length === 0 && (
          <li style={{ color: '#888', padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
            {projectsSupported ? 'No projects yet. Create one above.' : 'No projects API available.'}
          </li>
        )}
        {projects.map((p) => (
          <li key={p.id ?? p.project_id} style={{ marginBottom: 8 }}>
            <Link
              to={`/projects/${p.id ?? p.project_id}`}
              style={{
                display: 'block',
                padding: 16,
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 8,
                textDecoration: 'none',
                color: '#e0e0e0',
              }}
            >
              {p.name ?? p.project_name ?? p.id ?? p.project_id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
