import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPass, setShowPass] = useState(false);
  const from = location.state?.from || '/';

  const form = useForm({ email: '', password: '' }, async (values) => {
    await login(values);
    navigate(from, { replace: true });
  });

  return (
    <AuthLayout>
      <h1>Iniciar sesión</h1>
      <p className="muted mt-2">Bienvenido de nuevo. Ingresá a tu cuenta de Chippi.</p>
      <form onSubmit={form.handleSubmit} noValidate>
        {form.error && <div className="alert alert-danger">{form.error}</div>}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className={`input ${form.errors.email ? 'input-error' : ''}`}
            placeholder="vos@tunegocio.com" value={form.values.email} onChange={form.set('email')} required />
          {form.errors.email && <span className="field-error">{form.errors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="input-wrap">
            <input id="password" type={showPass ? 'text' : 'password'} autoComplete="current-password"
              className={`input ${form.errors.password ? 'input-error' : ''}`} placeholder="••••••••"
              value={form.values.password} onChange={form.set('password')} required />
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowPass((v) => !v)} aria-label="Mostrar contraseña">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.errors.password && <span className="field-error">{form.errors.password}</span>}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={form.submitting} style={{ padding: 12 }}>
          {form.submitting ? <Spinner small /> : 'Ingresar'}
        </button>
      </form>
      <p className="auth-footer">¿No tenés cuenta? <Link to="/registro">Creá tu cuenta gratis</Link></p>
    </AuthLayout>
  );
}
