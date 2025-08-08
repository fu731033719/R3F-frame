import { World } from '../ecs/core';
import { Input, PlayerControlled, Transform } from '../ecs/components';

function getInput(world: World) {
  const inputEntities = world.queryEntities(Input as any);
  if (inputEntities.length === 0) return null;
  return world.getComponent(inputEntities[0], Input)!;
}

export function rotateSystem(world: World, _dt: number) {
  const input = getInput(world);
  if (!input) return;

  const isDragging = Object.values(input.mouse.buttons).some(Boolean);
  if (!isDragging) return;

  const sensitivity = 0.005; // radians per pixel
  const dx = input.mouse.delta[0];
  const dy = input.mouse.delta[1];

  if (dx === 0 && dy === 0) return;

  world.forEach([Transform, PlayerControlled] as unknown as any, (entityId) => {
    const t = world.getComponent(entityId, Transform)!;

    let pitch = t.rotation[0] - dy * sensitivity;
    let yaw = t.rotation[1] - dx * sensitivity;
    const roll = t.rotation[2];

    // clamp pitch
    const halfPi = Math.PI / 2 - 0.01;
    if (pitch > halfPi) pitch = halfPi;
    if (pitch < -halfPi) pitch = -halfPi;

    t.rotation = [pitch, yaw, roll];
    world.upsertComponent(entityId, Transform, t);
  });
}