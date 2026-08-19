import StaticQrAccess from './StaticQrAccess';
import PukAccess from './PukAccess';

export default function AccessPoint({ type, entryUrl, config }) {
  if (type === 'puk') {
    return <PukAccess config={config} />;
  }
  return <StaticQrAccess entryUrl={entryUrl} config={config} />;
}
