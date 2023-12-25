export type Entity = number;

export class Component<T extends unknown = any> {
  done?: () => void;

  constructor(
    readonly name: string,
    public state: T,
    opts?: { doneProxy: (self: Component<T>) => () => void }
  ) {
    if (opts?.doneProxy) this.done = opts.doneProxy(this);
  }
}

export class Query<T extends unknown[] = unknown[]> {
  constructor(readonly required: string[]) {}

  execute(world: World): Set<Entity> {
    return world.execute(this);
  }
  select(world: World, entity: Entity) {
    const components = world.components(entity);
    const values = this.required.map(
      (componentName, i) => components.get(componentName)!
    ) as {
      // Thank you https://stackoverflow.com/a/64774250 -- wizardry!
      [Index in keyof T]: Component<T[Index]>;
    };
    return values;
  }
}

export class System<
  QueryMap extends Record<string, Query> = Record<string, Query>
> {
  readonly queries: QueryMap;

  init?: (world: World) => void;
  done?: (world: World) => void;
  update: (world: World, elapsedMs: number) => void;

  constructor(args: {
    queries: QueryMap;
    updateProxy: (
      self: System<QueryMap>
    ) => (world: World, elapsedMs: number) => void;
    initProxy?: (self: System<QueryMap>) => (world: World) => void;
    doneProxy?: (self: System<QueryMap>) => (world: World) => void;
  }) {
    this.queries = args.queries;
    this.update = args.updateProxy(this);
    if (args.initProxy) this.init = args.initProxy(this);
    if (args.doneProxy) this.done = args.doneProxy(this);
  }
}

export class World {
  private systems: System[] = [];

  private entityIdGenerator = 0;
  private entities = new Set<Entity>();
  private entityComponents = new Map<Entity, Map<string, Component>>();
  private cachedQueryEntities = new Map<Query, Set<Entity>>();

  public commandsQueue: Array<() => void> = [];
  private markForRebuildCached = new Set<Entity>();

  components(entity): Map<string, Component> {
    return this.entityComponents.get(entity)!;
  }
  select<T>(entity: Entity, componentNames: string[]): T {
    const components = this.components(entity);
    return componentNames.map((name) => components?.get(name)?.state) as T;
  }
  execute(query: Query): Set<Entity> {
    return this.cachedQueryEntities.get(query)!;
  }

  spawn(entity: Entity | null, ...components: Component[]): Entity {
    if (entity === null) {
      entity = ++this.entityIdGenerator;
    }
    this.commandsQueue.push(() => {
      this.entities.add(entity!);
      this.entityComponents.set(entity!, new Map<string, Component>());
      components.forEach((component) => this.addComponent(entity!, component));
      this.markForRebuildCached.add(entity!);
    });
    return entity;
  }
  despawn(entity: Entity) {
    this.commandsQueue.push(() => {
      this.components(entity)?.forEach((component) =>
        this.removeComponent(entity, component.name)
      );
      this.markForRebuildCached.add(entity);
      this.entities.delete(entity);
    });
  }
  addComponent(entity: Entity, component: Component) {
    this.components(entity)?.set(component.name, component);
    this.markForRebuildCached.add(entity);
  }
  removeComponent(entity: Entity, componentName: string) {
    const component = this.components(entity)?.get(componentName);
    if (component?.done) {
      component.done();
    }

    this.components(entity)?.delete(componentName);
    this.markForRebuildCached.add(entity);
  }

  private queryMatches(query: Query, components: Map<string, Component>) {
    const instanceComponentNames = Array.from(components.keys());
    return query.required.every((componentName) =>
      instanceComponentNames.includes(componentName)
    );
  }

  private rebuildCachedQueryEntities(entity: Entity) {
    this.cachedQueryEntities.forEach((cachedResults, query) => {
      const match = this.queryMatches(query, this.components(entity));
      if (match) {
        cachedResults.add(entity);
      } else {
        cachedResults.delete(entity);
      }
    });
  }

  register(system: System): World {
    if (system.init) {
      system.init(this);
    }
    this.systems.push(system);
    const queries = system.queries;
    if (queries) {
      Object.values(queries).forEach((query) =>
        this.cachedQueryEntities.set(query, new Set<Entity>())
      );
    }
    return this;
  }

  private prevTick: number = 0;
  private update(tick: number) {
    const elapsedMs = tick - this.prevTick;

    // Execute all commands in the queue.
    this.commandsQueue.forEach((fn) => fn());
    this.commandsQueue = [];

    // Iterate thru all entities mark for rebuilding the cache.
    this.markForRebuildCached.forEach((entity) =>
      this.rebuildCachedQueryEntities(entity)
    );
    this.markForRebuildCached.clear();

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
  }
}
