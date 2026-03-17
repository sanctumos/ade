import { Link } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Local ADE — agents, projects, and chat.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li><Link to="/projects">Projects</Link></li>
        <li><Link to="/agents">Agents</Link></li>
        <li><Link to="/chat">Chat</Link></li>
      </ul>
    </div>
  );
}
