import { World } from '../ecs/core';
import { Spin, Transform } from '../ecs/components';

export function spinSystem(world: World, dt: number) {
  const required = [Transform, Spin] as const;
  world.forEach(required as unknown as any, (entityId) => {
    const t = world.getComponent(entityId, Transform)!;
    const s = world.getComponent(entityId, Spin)!;
    t.rotation = [
      t.rotation[0] + s.speed[0] * dt,
      t.rotation[1] + s.speed[1] * dt,
      t.rotation[2] + s.speed[2] * dt,
    ];
    // write back in case user code relies on immutability
    world.upsertComponent(entityId, Transform, t);
  });
}