import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { useWorld } from '../ecs/react';
import { Object3DRef, Spin, Transform } from '../ecs/components';

function Cube({ position = [0, 0, 0], color = 'orange' as THREE.ColorRepresentation }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const world = useWorld();
  const entityId = useMemo(() => world.createEntity(), [world]);

  useEffect(() => {
    // Add initial components
    world.upsertComponent(entityId, Transform, {
      position: position as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
    });
    world.upsertComponent(entityId, Spin, { speed: [0, 1, 0] as [number, number, number] });

    return () => {
      world.destroyEntity(entityId);
    };
  }, [entityId, position, world]);

  useEffect(() => {
    // Attach the THREE object after mount
    world.upsertComponent(entityId, Object3DRef, { object: meshRef.current });
  }, [entityId, world]);

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function DemoScene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <gridHelper args={[10, 10]} />
      <OrbitControls makeDefault />
      <group position={[0, 0.5, 0]}>
        <Cube position={[0, 0, 0]} />
      </group>
    </>
  );
}