import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search, Bell, Plus, ChevronDown, User, Settings, LogOut, KanbanSquare, Users, CalendarDays } from 'lucide-react';
import { Avatar } from '../ui/Avatar.jsx';
import { useAuth, ROLE_LABELS } from '../../context/AuthContext.jsx';

function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

export function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userOpen, setUserOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const userRef = useRef(null);
  const newRef = useRef(null);
  useClickOutside(userRef, () => setUserOpen(false));
  useClickOutside(newRef, () => setNewOpen(false));

  return (
    <header className="topbar">
      <button className="btn btn-ghost btn-icon menu-btn" onClick={onMenu} aria-label="Abrir menú"><Menu size={20} /></button>
      <div className="topbar-search">
        <Search />
        <input className="input" placeholder="Buscar contactos, deals, empresas..." />
      </div>
      <div className="topbar-actions">
        <div className="dropdown" ref={newRef}>
          <button className="btn btn-primary btn-sm" onClick={() => setNewOpen((v) => !v)}>
            <Plus size={15} /> <span className="hide-mobile">Nuevo</span> <ChevronDown size={14} />
          </button>
          {newOpen && (
            <div className="dropdown-menu">
              <button className="dropdown-item" onClick={() => { setNewOpen(false); navigate('/contactos?nuevo=1'); }}><Users size={15} /> Contacto</button>
              <button className="dropdown-item" onClick={() => { setNewOpen(false); navigate('/pipeline?nuevo=1'); }}><KanbanSquare size={15} /> Oportunidad</button>
              <button className="dropdown-item" onClick={() => { setNewOpen(false); navigate('/calendario?nuevo=1'); }}><CalendarDays size={15} /> Reunión</button>
            </div>
          )}
        </div>
        <button className="btn btn-ghost btn-icon" title="Notificaciones"><Bell size={18} /></button>
        <div className="dropdown" ref={userRef}>
          <button className="btn btn-ghost" style={{ padding: '4px 6px' }} onClick={() => setUserOpen((v) => !v)}>
            <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
            <ChevronDown size={14} />
          </button>
          {userOpen && (
            <div className="dropdown-menu">
              <div style={{ padding: '8px 10px' }}>
                <div className="fw-600" style={{ fontSize: 13 }}>{user?.name}</div>
                <div className="text-xs muted">{user?.email}</div>
                <div className="text-xs faint">{ROLE_LABELS[user?.role]} · {user?.organization_name}</div>
              </div>
              <div className="dropdown-sep" />
              <button className="dropdown-item" onClick={() => { setUserOpen(false); navigate('/perfil'); }}><User size={15} /> Mi perfil</button>
              {user?.role === 'admin' && (
                <button className="dropdown-item" onClick={() => { setUserOpen(false); navigate('/configuracion'); }}><Settings size={15} /> Configuración</button>
              )}
              <div className="dropdown-sep" />
              <button className="dropdown-item danger" onClick={logout}><LogOut size={15} /> Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
