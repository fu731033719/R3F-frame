export type EntityId = number;

export interface ComponentType<T> {
  id: symbol;
  name: string;
  // Phantom field to bind generic T for type checking only
  readonly __t?: (arg: T) => T;
}

export function defineComponent<T>(name: string): ComponentType<T> {
  return { id: Symbol(name), name } as ComponentType<T>;
}

export type SystemFn = (world: World, dt: number) => void;

export class World {
  private nextEntityId: number = 1;
  private aliveEntityIds: Set<EntityId> = new Set();
  private componentStores: Map<ComponentType<any>, Map<EntityId, any>> = new Map();
  private systems: SystemFn[] = [];

  createEntity(): EntityId {
    const entityId = this.nextEntityId++;
    this.aliveEntityIds.add(entityId);
    return entityId;
  }

  destroyEntity(entityId: EntityId): void {
    if (!this.aliveEntityIds.has(entityId)) return;
    this.aliveEntityIds.delete(entityId);
    for (const store of this.componentStores.values()) {
      store.delete(entityId);
    }
  }

  addSystem(system: SystemFn): void {
    this.systems.push(system);
  }

  removeSystem(system: SystemFn): void {
    const idx = this.systems.indexOf(system);
    if (idx >= 0) this.systems.splice(idx, 1);
  }

  update(dt: number): void {
    for (let i = 0; i < this.systems.length; i++) {
      this.systems[i](this, dt);
    }
  }

  private ensureStore<T>(type: ComponentType<T>): Map<EntityId, T> {
    let store = this.componentStores.get(type);
    if (!store) {
      store = new Map<EntityId, T>();
      this.componentStores.set(type, store);
    }
    return store as Map<EntityId, T>;
  }

  addComponent<T>(entityId: EntityId, type: ComponentType<T>, value: T): T {
    if (!this.aliveEntityIds.has(entityId)) {
      throw new Error(`Entity ${entityId} is not alive`);
    }
    const store = this.ensureStore(type);
    store.set(entityId, value);
    return value;
  }

  upsertComponent<T>(entityId: EntityId, type: ComponentType<T>, value: T): T {
    return this.addComponent(entityId, type, value);
  }

  removeComponent<T>(entityId: EntityId, type: ComponentType<T>): void {
    const store = this.componentStores.get(type);
    if (!store) return;
    store.delete(entityId);
  }

  getComponent<T>(entityId: EntityId, type: ComponentType<T>): T | undefined {
    const store = this.componentStores.get(type) as Map<EntityId, T> | undefined;
    return store ? store.get(entityId) : undefined;
  }

  hasComponent<T>(entityId: EntityId, type: ComponentType<T>): boolean {
    const store = this.componentStores.get(type);
    return !!store && store.has(entityId);
  }

  queryEntities(...allTypes: ComponentType<any>[]): EntityId[] {
    if (allTypes.length === 0) return Array.from(this.aliveEntityIds);

    // Intersect entity id sets by iterating the smallest store first
    const stores = allTypes
      .map((t) => this.componentStores.get(t) || new Map<EntityId, unknown>())
      .sort((a, b) => a.size - b.size);

    if (stores.length === 0) return [];

    const result: EntityId[] = [];
    outer: for (const candidate of stores[0].keys()) {
      if (!this.aliveEntityIds.has(candidate)) continue;
      for (let i = 1; i < stores.length; i++) {
        if (!stores[i].has(candidate)) continue outer;
      }
      result.push(candidate);
    }
    return result;
  }

  forEach(allTypes: ComponentType<any>[], fn: (entityId: EntityId) => void): void {
    const entities = this.queryEntities(...allTypes);
    for (let i = 0; i < entities.length; i++) {
      fn(entities[i]);
    }
  }
}