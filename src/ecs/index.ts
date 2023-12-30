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
  const T extends ComponentConstructor[] = ComponentConstructor[]
> {
  constructor(readonly selectors: T) {
    Object.freeze(this);
  }

  matches(components: Map<string, Component> | undefined) {
    return this.selectors.every((selector) => components?.has(selector.name));
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

  events(commands: Commands): C {
    return this.selectors.map((selector) =>
      commands.events.get(selector as any)
    ) as C;
  }
}

export abstract class System {
  queries: Record<string, Query>;
  listener: SystemEventListener;

  init(commands: Commands) {}
  done(commands: Commands) {}
  update(commands: Commands, elapsedMs: number): void {}
}

class EntitiesManager extends Set<Entity> {
  private id = 0;

  generateId() {
    return ++this.id;
  }
}

class ComponentsManager {
  private instances = new Map<Entity, Map<string, Component>>();

  components(entity: Entity) {
    return this.instances.get(entity) || new Map<string, Component>();
  }

  select<
    const T extends ComponentConstructor[] = ComponentConstructor[],
    const C = { [Index in keyof T]: InstanceType<T[Index]> }
  >(entity: Entity, selectors: T): C {
    return selectors.map((selector) =>
      this.instances.get(entity)?.get(selector.name)
    ) as C;
  }

  attach(entity: Entity, component: Component) {
    if (!this.instances.has(entity)) {
      this.instances.set(entity, new Map<string, Component>());
    }
    component.id = entity;
    component.init?.();
    this.instances.get(entity)?.set(component.name, component);
  }

  detach(entity: Entity, component: Component) {
    component.done?.();
    this.instances.get(entity)?.delete(component.name);
  }
}

class QueryCacheManager {
  private cachedQueryEntities = new Map<Query, Set<Entity>>();
  private markForReindex = new Set<Entity>();

  constructor(private readonly componentsManager: ComponentsManager) {}

  execute(query: Query): Set<Entity> {
    return this.cachedQueryEntities.get(query) || new Set<Entity>();
  }

  register(query: Query) {
    this.cachedQueryEntities.set(query, new Set<Entity>());
  }

  reindex(entity: Entity) {
    this.markForReindex.add(entity);
  }

  flush() {
    for (const entity of this.markForReindex) {
      const components = this.componentsManager.components(entity);
      for (const [query, cached] of this.cachedQueryEntities) {
        if (query.matches(components)) {
          cached.add(entity);
        } else {
          cached.delete(entity);
        }
      }
    }
    this.markForReindex.clear();
  }
}

class EventsManager {
  private eventsQueue = new Map<string, SystemEvent[]>();

  add(event: SystemEvent) {
    const events = this.eventsQueue.get(event.name) || [];
    events.push(event);
    this.eventsQueue.set(event.name, events);
  }

  get(selector: typeof SystemEvent): SystemEvent[] {
    return this.eventsQueue.get(selector.name) || [];
  }

  flush() {
    this.eventsQueue.clear();
  }
}

/** A facade for all the *-managers in an ECS World.  */
export class Commands {
  private deferredQueue: Function[] = [];

  constructor(
    readonly entities: EntitiesManager,
    readonly components: ComponentsManager,
    readonly events: EventsManager,
    readonly queryCache: QueryCacheManager
  ) {}

  // Proxies.
  select = this.components.select.bind(
    this.components
  ) as typeof this.components.select;
  query = this.queryCache.execute.bind(
    this.queryCache
  ) as typeof this.queryCache.execute;

  queryWith<
    const T extends ComponentConstructor[] = ComponentConstructor[],
    const C = { [Index in keyof T]: InstanceType<T[Index]> }
  >(query: Query<T>): [Entity, C][] {
    const entities = Array.from(this.query(query));
    return entities.map((entity) => [
      entity,
      this.components.select(entity, query.selectors) as C,
    ]);
  }

  send(event: SystemEvent) {
    this.deferredQueue.push(() => this.events.add(event));
  }

  spawn(...components: Component[]): Entity {
    const entity = this.entities.generateId();
    this.deferredQueue.push(() => {
      this.entities.add(entity);
      for (const component of components) {
        this.attach(entity, component);
      }
      this.queryCache.reindex(entity);
    });
    return entity;
  }

  despawn(entity: Entity) {
    this.deferredQueue.push(() => {
      this.entities.delete(entity);
      for (const component of this.components.components(entity).values()) {
        component.done?.();
      }
      this.queryCache.reindex(entity);
    });
  }

  attach(entity: Entity, component: Component) {
    this.components.attach(entity, component);
    this.queryCache.reindex(entity);
  }

  detach(entity: Entity, component: Component) {
    this.components.detach(entity, component);
    this.queryCache.reindex(entity);
  }

  flush() {
    for (const deferred of this.deferredQueue) {
      deferred();
    }
    this.deferredQueue = [];
  }
}

export class World {
  private systems: System[] = [];

  private entities = new EntitiesManager();
  private components = new ComponentsManager();
  private events = new EventsManager();
  private queryCache = new QueryCacheManager(this.components);
  private commands = new Commands(
    this.entities,
    this.components,
    this.events,
    this.queryCache
  );

  register(system: System): World {
    if (system.init) {
      system.init(this.commands);
    }
    if (system.queries) {
      for (const query of Object.values(system.queries)) {
        this.queryCache.register(query);
      }
    }
    this.systems.push(system);
    return this;
  }

  once(callback: (commands: Commands) => void): World {
    callback(this.commands);
    return this;
  }

  private prevTick: number = 0;
  private update(tick: number) {
    // Schedule for another execution!
    window.requestAnimationFrame(this.update.bind(this));

    const elapsedMs = tick - this.prevTick;
    // Execute all the systems.
    for (const system of this.systems) {
      // If system has an event listener but no matching events, skip.
      if (system.listener) {
        const events = system.listener.events(this.commands);
        if (events.some((e) => !e || e.length === 0)) {
          continue;
        }
      }
      system.update(this.commands, elapsedMs);
    }
    this.prevTick = tick;

    this.flush();
  }

  run() {
    this.update(0);
    return this;
  }

  done() {
    for (const system of this.systems) {
      system.done(this.commands);
    }
    this.flush();
  }

  flush() {
    this.commands.flush();
    this.events.flush();
    this.queryCache.flush();
  }
}
