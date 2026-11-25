import '../campaigns/loves.css';

export default function LovesEntryShell({ children }) {
  return (
    <div className="loves-page">
      <div className="loves-page__scrim" aria-hidden />
      <div className="loves-container">
        <div className="loves-card">
          {children}
        </div>
      </div>
    </div>
  );
}
