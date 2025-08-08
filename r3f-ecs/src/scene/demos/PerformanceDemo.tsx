import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';

export function PerformanceDemo() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 5000;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D();

    const cols = 100;
    const rows = Math.ceil(COUNT / cols);
    const spacing = 0.5;

    let i = 0;
    for (; i < COUNT; i++) {
      const x = (i % cols) - cols / 2;
      const z = Math.floor(i / cols) - rows / 2;
      dummy.position.set(x * spacing, 0, z * spacing);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.45, 0.45, 0.45);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <gridHelper args={[50, 50]} />
      <OrbitControls makeDefault />
      <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={'teal'} />
      </instancedMesh>
    </>
  );
}