import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useForm } from '../hooks/useForm.js';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);

  const form = useForm({ organizationName: '', name: '', email: '', password: '' }, async (values) => {
    await register(values);
    navigate('/', { replace: true });
  });

  const fields = [
    { name: 'organizationName', label: 'Nombre del negocio', placeholder: 'Ej: Taller Gómez', autoComplete: 'organization' },
    { name: 'name', label: 'Tu nombre', placeholder: 'Nombre y apellido', autoComplete: 'name' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'vos@tunegocio.com', autoComplete: 'email' },
  ];

  return (
    <AuthLayout>
      <h1>Crear cuenta</h1>
      <p className="muted mt-2">Configurá tu CRM en menos de un minuto. Vas a ser el administrador de tu equipo.</p>
      <form onSubmit={form.handleSubmit} noValidate>
        {form.error && <div className="alert alert-danger">{form.error}</div>}
        {fields.map(({ name, label, type = 'text', placeholder, autoComplete }) => (
          <div className="field" key={name}>
            <label htmlFor={name}>{label}</label>
            <input id={name} type={type} autoComplete={autoComplete} className={`input ${form.errors[name] ? 'input-error' : ''}`}
              placeholder={placeholder} value={form.values[name]} onChange={form.set(name)} required />
            {form.errors[name] && <span className="field-error">{form.errors[name]}</span>}
          </div>
        ))}
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="input-wrap">
            <input id="password" type={showPass ? 'text' : 'password'} autoComplete="new-password"
              className={`input ${form.errors.password ? 'input-error' : ''}`} placeholder="Mínimo 8 caracteres"
              value={form.values.password} onChange={form.set('password')} required minLength={8} />
            <button type="button" className="btn btn-ghost btn-icon" onClick={() => setShowPass((v) => !v)} aria-label="Mostrar contraseña">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.errors.password && <span className="field-error">{form.errors.password}</span>}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={form.submitting} style={{ padding: 12 }}>
          {form.submitting ? <Spinner small /> : 'Crear mi cuenta'}
        </button>
        <p className="text-xs faint" style={{ textAlign: 'center' }}>Al registrarte se crea tu organización con un pipeline, tags y tipos de reunión listos para usar.</p>
      </form>
      <p className="auth-footer">¿Ya tenés cuenta? <Link to="/login">Iniciar sesión</Link></p>
    </AuthLayout>
  );
}
