import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, listAgents } from '../api/client';
import Loading from '../components/Loading';
import ErrorBanner from '../components/ErrorBanner';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      getProject(id).catch(() => null),
      listAgents().then((d) => Array.isArray(d) ? d : d?.data ?? d?.agents ?? []).catch(() => []),
    ]).then(([proj, list]) => {
      if (cancelled) return;
      setProject(proj);
      setAgents(list);
    }).catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <Loading message="Loading project…" />;
  if (error) return <ErrorBanner error={error} />;

  const projectAgents = project?.agent_ids
    ? agents.filter((a) => project.agent_ids.includes(a.id ?? a.agent_id))
    : agents;

  return (
    <div>
      <p style={{ marginBottom: 16 }}>
        <Link to="/projects" style={{ color: '#7eb8da' }}>← Projects</Link>
      </p>
      <h1>{project?.name ?? project?.project_name ?? id}</h1>
      <p style={{ color: '#c4c4c4', marginBottom: 24 }}>Project detail. Agents in this project (or all agents if backend does not link them):</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {projectAgents.length === 0 && <li style={{ color: '#c4c4c4' }}>No agents.</li>}
        {projectAgents.map((a) => (
          <li key={a.id ?? a.agent_id} style={{ marginBottom: 8 }}>
            <Link
              to={`/agents/${a.id ?? a.agent_id}`}
              style={{
                display: 'block',
                padding: 12,
                background: '#222222',
                border: '1px solid #5a5a5a',
                borderRadius: 8,
                textDecoration: 'none',
                color: '#e0e0e0',
              }}
            >
              {a.name ?? a.agent_name ?? a.id ?? a.agent_id}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
