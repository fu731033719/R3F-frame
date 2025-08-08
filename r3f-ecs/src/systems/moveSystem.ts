import { World } from '../ecs/core';
import { Input, PlayerControlled, Transform } from '../ecs/components';

function getInput(world: World) {
  const inputEntities = world.queryEntities(Input as any);
  if (inputEntities.length === 0) return null;
  return world.getComponent(inputEntities[0], Input)!;
}

export function moveSystem(world: World, dt: number) {
  const input = getInput(world);
  if (!input) return;

  const speed = 3; // units per second

  world.forEach([Transform, PlayerControlled] as unknown as any, (entityId) => {
    const t = world.getComponent(entityId, Transform)!;

    let moveX = 0;
    let moveZ = 0;

    if (input.keys['KeyW']) moveZ -= 1;
    if (input.keys['KeyS']) moveZ += 1;
    if (input.keys['KeyA']) moveX -= 1;
    if (input.keys['KeyD']) moveX += 1;

    if (moveX === 0 && moveZ === 0) return;

    // normalize
    const length = Math.hypot(moveX, moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    // move relative to current yaw (rotation around Y)
    const yaw = t.rotation[1];
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const localX = moveX * cos - moveZ * sin;
    const localZ = moveX * sin + moveZ * cos;

    t.position = [
      t.position[0] + localX * speed * dt,
      t.position[1],
      t.position[2] + localZ * speed * dt,
    ];

    world.upsertComponent(entityId, Transform, t);
  });
}