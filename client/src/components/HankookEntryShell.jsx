import '../campaigns/hankook.css';

export default function HankookEntryShell({ children }) {
  return (
    <div className="hankook-page">
      <div className="hankook-page__scrim" aria-hidden />
      <div className="hankook-container">
        <div className="hankook-card">
          {children}
        </div>
      </div>
    </div>
  );
}
