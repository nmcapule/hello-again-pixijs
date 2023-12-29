/** An ECS entity type alias. The id is generated when spawned in a world. */
export type Entity = number;

/** An ECS component. Inherit this class to create a valid component. */
export abstract class Component<T extends any = any> {
  // Attached to entity. Filled up by World when spawned.
  id: Entity;

  constructor(
    readonly state: T,
    readonly init?: () => void,
    readonly done?: () => void
  ) {}

  get name() {
    return this.constructor.name;
  }
}

/** A helper type alias as an alternative to `typeof Component<unknown>`. */
type ComponentConstructor<T = unknown> = new (...args: any) => Component<T>;

/** An ECS query. */
export class Query<
  const T extends ComponentConstructor[] = ComponentConstructor[],
  const C = { [Index in keyof T]: InstanceType<T[Index]> }
> {
  constructor(
    readonly selectors: T,
    readonly filter?: (components: Map<string, Component>) => boolean
  ) {}

  components(world: World, entity: Entity): C {
    const components = world.components(entity);
    const values = this.selectors
      .map((selector) => selector.name)
      .map((name) => components.get(name)!);
    return values as unknown as C;
  }

  execute(world: World) {
    const entities = this.find(world);
    return Array.from(entities).map(
      (entity) => [entity, this.components(world, entity)] as [Entity, C]
    );
  }

  find(world: World): Set<Entity> {
    return world.execute(this);
  }

  findOne(world: World): Entity {
    return world.execute(this).values().next().value;
  }

  matches(components: Map<string, Component>) {
    // Needs to have all the components.
    if (!this.selectors.every((selector) => components.has(selector.name))) {
      return false;
    }
    // Needs to match filter, if it exist.
    if (this.filter) {
      if (!this.filter(components)) {
        return false;
      }
    }
    return true;
  }
}

/** An ECS system event. Inherit this class to create a valid system event. */
export abstract class SystemEvent<T extends any = any> {
  constructor(readonly data: T) {}
  get name() {
    return this.constructor.name;
  }
}

/** A helper type alias as an alternative to `typeof SystemEvent<unknown>`. */
type SystemEventConstructor<T = unknown> = new (...args: any) => SystemEvent<T>;

export class SystemEventListener<
  const T extends SystemEventConstructor[] = SystemEventConstructor[],
  const C = { [Index in keyof T]: InstanceType<T[Index]>[] }
> {
  constructor(readonly selectors: T) {}

  events(world: World): C {
    return world.events(this as unknown as SystemEventListener) as C;
  }
}

export abstract class System {
  queries: Record<string, Query>;
  listener: SystemEventListener;

  init(world: World) {}
  done(world: World) {}
  update(world: World, elapsedMs: number): void {}
}

export class World {
  private systems: System[] = [];

  private entityIdGenerator = 0;
  private entities = new Set<Entity>();
  private entityComponents = new Map<Entity, Map<string, Component>>();
  private cachedQueryEntities = new Map<Query, Set<Entity>>();

  public eventsQueue = new Map<string, SystemEvent[]>();
  public commandsQueue: Array<() => void> = [];
  private markForReindex = new Set<Entity>();

  components(entity): Map<string, Component> {
    if (!entity) {
      throw new Error("getting component for null entity");
    }
    return this.entityComponents.get(entity)!;
  }
  execute(query: Query<any, any>): Set<Entity> {
    return this.cachedQueryEntities.get(query) || new Set();
  }
  events(listener: SystemEventListener) {
    return listener.selectors
      .map((selector) => selector.name)
      .map((name) => this.eventsQueue.get(name));
  }
  send(event: SystemEvent) {
    this.commandsQueue.push(() => {
      const queue = this.eventsQueue.get(event.name) || [];
      queue.push(event);
      this.eventsQueue.set(event.name, queue);
    });
  }

  spawn(...components: Component[]): Entity {
    const entity = ++this.entityIdGenerator;
    this.commandsQueue.push(() => {
      this.entities.add(entity!);
      this.entityComponents.set(entity!, new Map<string, Component>());
      for (const component of components) {
        this.attach(entity!, component);
      }
      this.markForReindex.add(entity!);
    });
    return entity;
  }
  despawn(entity: Entity) {
    this.commandsQueue.push(() => {
      for (const [componentName, _] of this.components(entity)) {
        this.detach(entity, componentName);
      }
      this.markForReindex.add(entity);
      this.entities.delete(entity);
    });
  }

  attach(entity: Entity, component: Component) {
    this.components(entity)?.set(component.name, component);
    component.id = entity;
    if (component.init) {
      component.init();
    }
    this.markForReindex.add(entity);
  }
  detach(entity: Entity, componentName: string) {
    const component = this.components(entity)?.get(componentName);
    if (component?.done) {
      component.done();
    }
    this.components(entity)?.delete(componentName);
    this.markForReindex.add(entity);
  }

  private reindex(entity: Entity) {
    const components = this.components(entity);
    for (const [query, cached] of this.cachedQueryEntities) {
      const match = query.matches(components);
      if (match) {
        cached.add(entity);
      } else {
        cached.delete(entity);
      }
    }
  }

  prepare(query: Query): World {
    this.cachedQueryEntities.set(query, new Set<Entity>());
    return this;
  }

  register(system: System): World {
    if (system.init) {
      system.init(this);
    }
    if (system.queries) {
      for (const [_, query] of Object.entries(system.queries)) {
        this.prepare(query);
      }
    }
    this.systems.push(system);
    return this;
  }

  once(callback: (world: World) => void): World {
    callback(this);
    return this;
  }

  private prevTick: number = 0;
  private update(tick: number) {
    // Schedule for another execution!
    window.requestAnimationFrame(this.update.bind(this));

    const elapsedMs = tick - this.prevTick;

    // Execute all commands in the queue.
    for (const command of this.commandsQueue) {
      command();
    }
    this.commandsQueue = [];

    // Iterate thru all entities mark for rebuilding the cache.
    for (const entity of this.markForReindex) {
      this.reindex(entity);
    }
    this.markForReindex.clear();

    // Execute all the systems.
    for (const system of this.systems) {
      // If system has an event listener but no matching events, skip.
      if (system.listener) {
        const events = system.listener.events(this);
        if (events.some((e) => !e || e.length === 0)) {
          continue;
        }
      }
      system.update(this, elapsedMs);
    }
    this.prevTick = tick;

    // Clear events.
    this.eventsQueue.clear();
  }

  run() {
    this.update(0);
    return this;
  }
}
