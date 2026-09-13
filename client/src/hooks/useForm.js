import { useState } from 'react';
import { ApiError } from '../api/client.js';

/** Manejo simple de formularios con errores por campo provenientes de la API. */
export function useForm(initial, onSubmit) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const set = (name) => (e) => {
    const value = e?.target ? e.target.value : e;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    setErrors({});
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        const map = {};
        for (const d of err.details) map[d.campo] = d.mensaje;
        setErrors(map);
      }
      setError(err.message || 'Ocurrió un error');
    } finally {
      setSubmitting(false);
    }
  };

  return { values, set, errors, error, submitting, handleSubmit };
}
