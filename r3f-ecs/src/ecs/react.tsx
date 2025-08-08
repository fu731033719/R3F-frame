import { createContext, useContext, useMemo, Suspense } from 'react';
import type { PropsWithChildren } from 'react';
import { Canvas, type CanvasProps, useFrame } from '@react-three/fiber';
import { World } from './core';

const WorldContext = createContext<World | null>(null);

export function useWorld(): World {
  const world = useContext(WorldContext);
  if (!world) throw new Error('useWorld must be used within <ECSProvider>');
  return world;
}

export function ECSProvider({ world, children }: PropsWithChildren<{ world: World }>) {
  return <WorldContext.Provider value={world}>{children}</WorldContext.Provider>;
}

function ECSLoop() {
  const world = useWorld();
  useFrame((_, dt) => {
    world.update(dt);
  });
  return null;
}

export type ECSCanvasProps = CanvasProps & { world?: World };

export function ECSCanvas({ world: providedWorld, children, ...rest }: PropsWithChildren<ECSCanvasProps>) {
  const world = useMemo(() => providedWorld ?? new World(), [providedWorld]);

  return (
    <ECSProvider world={world}>
      <Canvas shadows dpr={[1, 2]} {...rest}>
        <ECSLoop />
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </ECSProvider>
  );
}