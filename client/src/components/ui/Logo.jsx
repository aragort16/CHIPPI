export function Logo({ size = 32, withText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} style={{ lineHeight: 1 }}>
      <img src="/logo.svg" alt="Chippi" width={size} height={size} style={{ display: 'block' }} />
      {withText && (
        <span style={{ fontSize: size * 0.68, fontWeight: 800, letterSpacing: '-0.03em' }}>chippi</span>
      )}
    </div>
  );
}
