import { useEffect, useMemo, useState } from 'react';
import './App.css';
import { ECSCanvas } from './ecs/react';
import { World } from './ecs/core';
import { renderSyncSystem } from './systems/renderSyncSystem';
import { MoveDemo } from './scene/demos/MoveDemo';
import { ScaleDemo } from './scene/demos/ScaleDemo';
import { RotateDemo } from './scene/demos/RotateDemo';
import { InputController } from './scene/InputController';

function App() {
  const world = useMemo(() => new World(), []);
  const [demo, setDemo] = useState<'move' | 'scale' | 'rotate'>('move');

  useEffect(() => {
    world.addSystem(renderSyncSystem);
    return () => {
      world.removeSystem(renderSyncSystem);
    };
  }, [world]);

  return (
    <div className="app-root" style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px', display: 'flex', gap: 8 }}>
        <button onClick={() => setDemo('move')} disabled={demo === 'move'}>Move Demo (WASD + Mouse)</button>
        <button onClick={() => setDemo('scale')} disabled={demo === 'scale'}>Scale Demo (Wheel)</button>
        <button onClick={() => setDemo('rotate')} disabled={demo === 'rotate'}>Rotate Demo (Drag)</button>
      </div>
      <div style={{ flex: 1 }}>
        <ECSCanvas world={world} camera={{ position: [4, 3, 6], fov: 60 }}>
          <InputController />
          {demo === 'move' && <MoveDemo />}
          {demo === 'scale' && <ScaleDemo />}
          {demo === 'rotate' && <RotateDemo />}
        </ECSCanvas>
      </div>
    </div>
  );
}

export default App;
