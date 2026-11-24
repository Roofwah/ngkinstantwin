import '../campaigns/guinness.css';

export default function GuinnessEntryShell({ children }) {
  return (
    <div className="guinness-page">
      <div className="guinness-page__scrim" aria-hidden />
      <div className="guinness-container">
        <div className="guinness-card">
          {children}
        </div>
      </div>
    </div>
  );
}
