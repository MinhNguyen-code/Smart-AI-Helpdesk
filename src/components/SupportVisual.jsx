import { lazy, Suspense, useEffect, useState } from 'react';

const ThreeScene = lazy(() => import('./SupportScene'));

function StaticScene() {
  return <div className="support-scene scene-static" role="img" aria-label="Minh họa bàn hỗ trợ CNTT với màn hình, bàn làm việc và chậu cây">
    <div className="scene-monitor"><span className="scene-monitor-line"/><span className="scene-monitor-line short"/></div>
    <div className="scene-stand"/><div className="scene-desk"/><div className="scene-plant"/>
  </div>;
}

export default function SupportVisual() {
  const [renderThree, setRenderThree] = useState(false);
  useEffect(() => {
    const compact = window.matchMedia('(max-width: 650px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setRenderThree(!compact.matches && !reduced.matches && !navigator.connection?.saveData);
    update();
    compact.addEventListener('change', update);
    reduced.addEventListener('change', update);
    return () => { compact.removeEventListener('change', update); reduced.removeEventListener('change', update); };
  }, []);
  return renderThree ? <Suspense fallback={<StaticScene/>}><ThreeScene/></Suspense> : <StaticScene/>;
}
