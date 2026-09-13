export function EmptyState({ icon: Icon, children }) {
  return (
    <div className="empty">
      {Icon && <Icon />}
      <div>{children}</div>
    </div>
  );
}
