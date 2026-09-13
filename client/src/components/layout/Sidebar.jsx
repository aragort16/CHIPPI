import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Logo } from '../ui/Logo.jsx';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext.jsx';
import { NAV } from './nav.js';

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();

  return (
    <>
      <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Logo size={34} />
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item, i) => {
            if (item.section) return <div key={`s-${i}`} className="nav-section">{item.section}</div>;
            if (item.roles && !item.roles.includes(user?.role)) return null;
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={onClose}>
                <Icon />
                <span className="truncate">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Avatar name={user?.name} src={user?.avatar_url} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="fw-600 truncate" style={{ fontSize: 13 }}>{user?.name}</div>
              <div className="text-xs muted truncate">{ROLE_LABELS[user?.role] || user?.role}</div>
            </div>
            <button className="btn btn-ghost btn-icon" title="Cerrar sesión" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
