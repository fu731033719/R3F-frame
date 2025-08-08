import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useWorld } from '../ecs/react';
import { Input } from '../ecs/components';

export function InputController() {
  const world = useWorld();
  const { gl } = useThree();
  const inputEntityId = useMemo(() => world.createEntity(), [world]);

  const inputStateRef = useRef({
    keys: {} as Record<string, boolean>,
    mouse: {
      buttons: {} as Record<number, boolean>,
      delta: [0, 0] as [number, number],
      wheel: 0,
    },
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      inputStateRef.current.keys[e.code] = true;
    }
    function onKeyUp(e: KeyboardEvent) {
      inputStateRef.current.keys[e.code] = false;
    }
    function onPointerDown(e: PointerEvent) {
      inputStateRef.current.mouse.buttons[e.button] = true;
    }
    function onPointerUp(e: PointerEvent) {
      inputStateRef.current.mouse.buttons[e.button] = false;
    }
    function onPointerMove(e: PointerEvent) {
      // only record delta when a button is pressed
      if (Object.values(inputStateRef.current.mouse.buttons).some(Boolean)) {
        inputStateRef.current.mouse.delta[0] += e.movementX;
        inputStateRef.current.mouse.delta[1] += e.movementY;
      }
    }
    function onWheel(e: WheelEvent) {
      inputStateRef.current.mouse.wheel += e.deltaY;
    }

    const elem = gl.domElement;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    elem.addEventListener('pointerdown', onPointerDown);
    elem.addEventListener('pointerup', onPointerUp);
    elem.addEventListener('pointermove', onPointerMove);
    elem.addEventListener('wheel', onWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      elem.removeEventListener('pointerdown', onPointerDown);
      elem.removeEventListener('pointerup', onPointerUp);
      elem.removeEventListener('pointermove', onPointerMove);
      elem.removeEventListener('wheel', onWheel as any);
    };
  }, [gl.domElement]);

  useEffect(() => {
    return () => {
      // cleanup input entity on unmount
      try {
        world.destroyEntity(inputEntityId);
      } catch {}
    };
  }, [inputEntityId, world]);

  useFrame(() => {
    // write to ECS each frame
    world.upsertComponent(inputEntityId, Input, {
      keys: { ...inputStateRef.current.keys },
      mouse: {
        buttons: { ...inputStateRef.current.mouse.buttons },
        delta: [inputStateRef.current.mouse.delta[0], inputStateRef.current.mouse.delta[1]] as [number, number],
        wheel: inputStateRef.current.mouse.wheel,
      },
    });

    // reset per-frame deltas
    inputStateRef.current.mouse.delta[0] = 0;
    inputStateRef.current.mouse.delta[1] = 0;
    inputStateRef.current.mouse.wheel = 0;
  });

  return null;
}