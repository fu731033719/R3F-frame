import { World } from '../ecs/core';
import { Object3DRef, Transform } from '../ecs/components';

export function renderSyncSystem(world: World) {
  const required = [Transform, Object3DRef] as const;
  world.forEach(required as unknown as any, (entityId) => {
    const t = world.getComponent(entityId, Transform)!;
    const ref = world.getComponent(entityId, Object3DRef)!;
    const obj = ref.object;
    if (!obj) return;

    obj.position.set(t.position[0], t.position[1], t.position[2]);
    obj.rotation.set(t.rotation[0], t.rotation[1], t.rotation[2]);
    obj.scale.set(t.scale[0], t.scale[1], t.scale[2]);
  });
}