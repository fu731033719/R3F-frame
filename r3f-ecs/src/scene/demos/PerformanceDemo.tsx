import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls, Stats } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';

export function PerformanceDemo() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 100000;

  // Controls panel
  const { animate, rotate, bob, colorCycle, speed, bobAmplitude } = useControls('Performance', {
    animate: true,
    rotate: true,
    bob: true,
    colorCycle: false,
    speed: { value: 1.0, min: 0.1, max: 5.0, step: 0.1 },
    bobAmplitude: { value: 0.25, min: 0, max: 1, step: 0.01 },
  });

  // Precomputed per-instance randoms to avoid per-frame RNG cost
  const phases = useMemo(() => {
    const a = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) a[i] = Math.random() * Math.PI * 2;
    return a;
  }, [COUNT]);

  const hues = useMemo(() => {
    const a = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) a[i] = Math.random();
    return a;
  }, [COUNT]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (!mesh.instanceColor || mesh.instanceColor.count !== COUNT) {
      mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(COUNT * 3), 3);
    }
    const dummy = new THREE.Object3D();

    const cols = 100;
    const rows = Math.ceil(COUNT / cols);
    const spacing = 0.5;

    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const x = (i % cols) - cols / 2;
      const z = Math.floor(i / cols) - rows / 2;
      dummy.position.set(x * spacing, 0, z * spacing);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(0.45, 0.45, 0.45);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // per-instance color
      color.setHSL(hues[i], 0.6, 0.5);
      mesh.setColorAt(i, color);
    }

    // Apply initial buffers
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [COUNT, hues]);

  useFrame((state) => {
    if (!animate) return;
    const mesh = meshRef.current;
    if (!mesh) return;

    const dummy = new THREE.Object3D();
    const cols = 100;
    const rows = Math.ceil(COUNT / cols);
    const spacing = 0.5;

    // Time scaled by control speed
    const t = state.clock.elapsedTime * speed;

    const color = new THREE.Color();

    for (let i = 0; i < COUNT; i++) {
      const x = (i % cols) - cols / 2;
      const z = Math.floor(i / cols) - rows / 2;

      const y = bob ? Math.sin(t + phases[i]) * bobAmplitude : 0;
      dummy.position.set(x * spacing, y, z * spacing);

      const ry = rotate ? (t + phases[i]) * 0.5 : 0;
      dummy.rotation.set(0, ry, 0);

      dummy.scale.set(0.45, 0.45, 0.45);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      if (colorCycle) {
        // shift hue over time for a subtle effect
        color.setHSL(((hues[i] + t * 0.05) % 1 + 1) % 1, 0.6, 0.5);
        mesh.setColorAt(i, color);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (colorCycle && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <>
      <Stats />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <gridHelper args={[50, 50]} />
      <OrbitControls makeDefault />
      <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, COUNT]} frustumCulled={true}>
        <boxGeometry args={[1, 1, 1]} />
        {/* <meshStandardMaterial color={'white'} vertexColors /> */}
         <meshStandardMaterial vertexColors metalness={0} roughness={0.9} />
      </instancedMesh>
    </>
  );
}