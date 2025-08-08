import { World } from '../ecs/core';
import { Input, PlayerControlled, Transform } from '../ecs/components';

function getInput(world: World) {
  const inputEntities = world.queryEntities(Input as any);
  if (inputEntities.length === 0) return null;
  return world.getComponent(inputEntities[0], Input)!;
}

export function scaleSystem(world: World, _dt: number) {
  const input = getInput(world);
  if (!input) return;

  const wheel = input.mouse.wheel;
  if (wheel === 0) return;

  const scaleDelta = -wheel * 0.001; // invert for natural zoom-in on wheel up

  world.forEach([Transform, PlayerControlled] as unknown as any, (entityId) => {
    const t = world.getComponent(entityId, Transform)!;
    const factor = Math.exp(scaleDelta); // smooth multiplicative scaling
    t.scale = [t.scale[0] * factor, t.scale[1] * factor, t.scale[2] * factor];
    // clamp
    const minS = 0.2;
    const maxS = 5;
    t.scale = [
      Math.min(maxS, Math.max(minS, t.scale[0])),
      Math.min(maxS, Math.max(minS, t.scale[1])),
      Math.min(maxS, Math.max(minS, t.scale[2])),
    ];
    world.upsertComponent(entityId, Transform, t);
  });
}