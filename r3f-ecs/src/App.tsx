import { useEffect, useState } from 'react';
import './App.css';
import { ECSCanvas } from './ecs/react';
import { World } from './ecs/core';
import { renderSyncSystem } from './systems/renderSyncSystem';
import { MoveDemo } from './scene/demos/MoveDemo';
import { ScaleDemo } from './scene/demos/ScaleDemo';
import { RotateDemo } from './scene/demos/RotateDemo';
import { ComboDemo } from './scene/demos/ComboDemo';
import { InputController } from './scene/InputController';
import { PerformanceDemo } from './scene/demos/PerformanceDemo';

function App() {
  const [demo, setDemo] = useState<'move' | 'scale' | 'rotate' | 'combo' | 'perf'>('move');
  const [world, setWorld] = useState<World>(() => new World());

  // Create a fresh world whenever demo changes to avoid cross-demo entity leakage
  useEffect(() => {
    setWorld(new World());
  }, [demo]);

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
        <button onClick={() => setDemo('combo')} disabled={demo === 'combo'}>Combo Demo (WASD + Drag + Wheel)</button>
        <button onClick={() => setDemo('perf')} disabled={demo === 'perf'}>Performance Demo (5k cubes)</button>
      </div>
      <div style={{ flex: 1 }}>
        <ECSCanvas key={demo} world={world} camera={{ position: [4, 3, 6], fov: 60 }}>
          {/* Input is only needed for interactive demos; harmless in perf */}
          <InputController />
          {demo === 'move' && <MoveDemo />}
          {demo === 'scale' && <ScaleDemo />}
          {demo === 'rotate' && <RotateDemo />}
          {demo === 'combo' && <ComboDemo />}
          {demo === 'perf' && <PerformanceDemo />}
        </ECSCanvas>
      </div>
    </div>
  );
}

export default App;
