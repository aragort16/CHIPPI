import { Bot, KanbanSquare, CalendarDays, Workflow } from 'lucide-react';
import { Logo } from '../ui/Logo.jsx';

const FEATURES = [
  { icon: Bot, text: 'Agentes de IA que atienden y califican leads 24/7' },
  { icon: KanbanSquare, text: 'Pipeline de ventas visual para talleres y concesionarios' },
  { icon: CalendarDays, text: 'Reservas online y recordatorios automáticos' },
  { icon: Workflow, text: 'Automatizaciones que conectan todo tu negocio' },
];

export function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <aside className="auth-aside">
        <Logo size={44} />
        <div>
          <h2>El CRM que conecta todo tu negocio automáticamente.</h2>
          <p>CRM + IA + Automatización para talleres de servicio y concesionarios.</p>
          <div style={{ marginTop: 28 }}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div className="auth-feature" key={text}><span className="fi"><Icon /></span>{text}</div>
            ))}
          </div>
        </div>
        <p className="text-sm faint">© {new Date().getFullYear()} Chippi. Todos los derechos reservados.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-mobile-brand"><Logo size={40} /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
