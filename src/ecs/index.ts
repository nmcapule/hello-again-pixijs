export type Entity = number;

export class Component<T extends unknown = any> {
  init?: () => void;
  done?: () => void;

  constructor(
    readonly name: string,
    public state: T,
    opts?: {
      init: () => void;
      done: () => void;
    }
  ) {
    this.init = opts?.init;
    this.done = opts?.done;
  }

  static make<T>(
    name: string,
    state: T,
    opts?: { init: () => void; done: () => void }
  ) {
    return new Component<T>(name, state, opts);
  }
}

export class Query<T extends unknown[] = unknown[]> {
  constructor(readonly required: string[]) {}
  static make<T extends unknown[]>(required: string[]) {
    return new Query<T>(required);
  }

  execute(world: World) {
    const entities = this.find(world);
    return Array.from(entities).map(
      (entity) =>
        [entity, this.components(world, entity)] as [
          Entity,
          { [Index in keyof T]: Component<T[Index]> }
        ]
    );
  }
  find(world: World): Set<Entity> {
    return world.execute(this);
  }
  findOne(world: World): Entity {
    return world.execute(this).values().next().value;
  }
  components(world: World, entity: Entity) {
    const components = world.components(entity);
    const values = this.required.map(
      (componentName, _) => components.get(componentName)!
      // Thank you https://stackoverflow.com/a/64774250 -- wizardry!
    ) as { [Index in keyof T]: Component<T[Index]> };
    return values;
  }

  matches(componentNames: Set<string>) {
    return this.required.every((componentName) =>
      componentNames.has(componentName)
    );
  }
}

export class System<
  QueryMap extends Record<string, Query> = Record<string, Query>
> {
  init?: (world: World) => void;
  done?: (world: World) => void;
  update: (world: World, elapsedMs: number) => void;

  constructor(args: {
    updateProxy: (
      self: System<QueryMap>
    ) => (world: World, elapsedMs: number) => void;
    initProxy?: (self: System<QueryMap>) => (world: World) => void;
    doneProxy?: (self: System<QueryMap>) => (world: World) => void;
  }) {
    this.update = args.updateProxy(this);
    if (args.initProxy) this.init = args.initProxy(this);
    if (args.doneProxy) this.done = args.doneProxy(this);
  }

  static make(update: (world: World, elapsedMs: number) => void) {
    return new System({ updateProxy: (self) => update });
  }
}

export class World {
  private systems: System[] = [];

  private entityIdGenerator = 0;
  private entities = new Set<Entity>();
  private entityComponents = new Map<Entity, Map<string, Component>>();
  private cachedQueryEntities = new Map<Query, Set<Entity>>();

  public commandsQueue: Array<() => void> = [];
  private markForReindex = new Set<Entity>();

  components(entity): Map<string, Component> {
    return this.entityComponents.get(entity)!;
  }
  select<T>(entity: Entity, componentNames: string[]): T {
    const components = this.components(entity);
    return componentNames.map((name) => components?.get(name)?.state) as T;
  }
  execute(query: Query): Set<Entity> {
    return this.cachedQueryEntities.get(query) || new Set();
  }

  spawn(entity: Entity | null, ...components: Component[]): Entity {
    if (entity === null) {
      entity = ++this.entityIdGenerator;
    }
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
    const componentNames = new Set(this.components(entity).keys());
    for (const [query, cached] of this.cachedQueryEntities) {
      const match = query.matches(componentNames);
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
    this.systems.push(system);
    return this;
  }

  private prevTick: number = 0;
  private update(tick: number) {
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
      system.update(this, elapsedMs);
    }
    this.prevTick = tick;

    // Schedule for another execution!
    window.requestAnimationFrame(this.update.bind(this));
  }

  run() {
    this.update(0);
    return this;
  }
}

export const s = System.make;
export const c = Component.make;
export const q = Query.make;
