import { initials } from '../../utils/format.js';

export function Avatar({ name, src, size = '' }) {
  return (
    <span className={`avatar ${size ? `avatar-${size}` : ''}`} title={name}>
      {src ? <img src={src} alt={name} /> : initials(name || '?')}
    </span>
  );
}
