import { useEffect, useMemo } from 'react';
import './App.css';
import { ECSCanvas } from './ecs/react';
import { World } from './ecs/core';
import { DemoScene } from './scene/DemoScene';
import { renderSyncSystem } from './systems/renderSyncSystem';
import { spinSystem } from './systems/spinSystem';

function App() {
  const world = useMemo(() => new World(), []);

  useEffect(() => {
    world.addSystem(spinSystem);
    world.addSystem(renderSyncSystem);
    return () => {
      world.removeSystem(spinSystem);
      world.removeSystem(renderSyncSystem);
    };
  }, [world]);

  return (
    <div className="app-root" style={{ width: '100%', height: '100vh' }}>
      <ECSCanvas world={world} camera={{ position: [4, 3, 6], fov: 60 }}>
        <DemoScene />
      </ECSCanvas>
    </div>
  );
}

export default App;
