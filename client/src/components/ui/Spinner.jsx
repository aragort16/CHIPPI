export const Spinner = ({ small }) => <span className={`spinner ${small ? 'spinner-sm' : ''}`} aria-label="Cargando" />;
export const PageLoader = () => (
  <div className="page-loader"><Spinner /></div>
);
