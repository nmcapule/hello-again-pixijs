export type Entity = number;

export interface Component {
  name: string;
  state: any;
  done?: () => void;
}

export function c(name: string, state?: any, done?: () => void): Component {
  return { name, state, done };
}

export interface Query {
  required: string[];
}

export interface System {
  queries?: { [key: string]: Query };
  update(
    elapsedMs: number,
    extras: {
      world: World;
      queries?: { [key: string]: Query };
    }
  );
}

export class World {
  private systems: System[] = [];
  private entities = new Set<Entity>();
  private entityComponents = new Map<Entity, Map<string, Component>>();
  private entityIdGenerator = 0;
  private cachedSystemQueryResults = new Map<Query, Set<Entity>>();

  public commandsQueue: Array<() => void> = [];
  // private markForRemoveEntity = new Set<Entity>();
  private markForRebuildCachedSystemQuery = new Set<Entity>();

  components(entity): Map<string, Component> {
    return this.entityComponents.get(entity)!;
  }
  select<T>(entity: Entity, componentNames: string[]): T {
    const components = this.components(entity);
    return componentNames.map((name) => components?.get(name)?.state) as T;
  }
  execute(query: Query): Set<Entity> {
    return this.cachedSystemQueryResults.get(query)!;
  }

  spawn(entity: Entity | null, ...components: Component[]): Entity {
    if (entity === null) {
      entity = ++this.entityIdGenerator;
    }
    this.commandsQueue.push(() => {
      this.entities.add(entity!);
      this.entityComponents.set(entity!, new Map<string, Component>());
      components.forEach((component) => this.addComponent(entity!, component));
      this.markForRebuildCachedSystemQuery.add(entity!);
    });
    return entity;
  }
  despawn(entity: Entity) {
    this.commandsQueue.push(() => {
      this.components(entity)?.forEach((component) =>
        this.removeComponent(entity, component.name)
      );
      this.markForRebuildCachedSystemQuery.add(entity);
      this.entities.delete(entity);
    });
  }
  addComponent(entity: Entity, component: Component) {
    this.components(entity)?.set(component.name, component);
    this.markForRebuildCachedSystemQuery.add(entity);
  }
  removeComponent(entity: Entity, componentName: string) {
    const component = this.components(entity)?.get(componentName);
    if (component?.done) {
      component.done();
    }

    this.components(entity)?.delete(componentName);
    this.markForRebuildCachedSystemQuery.add(entity);
  }

  private queryMatches(query: Query, components: Map<string, Component>) {
    const instanceComponentNames = Array.from(components.keys());
    return query.required.every((componentName) =>
      instanceComponentNames.includes(componentName)
    );
  }
  private rebuildCacheForEntity(entity: Entity) {
    this.cachedSystemQueryResults.forEach((cachedResults, query) => {
      const match = this.queryMatches(query, this.components(entity));
      if (match) {
        cachedResults.add(entity);
      } else {
        cachedResults.delete(entity);
      }
    });
  }

  register(system: System): World {
    this.systems.push(system);
    const queries = system.queries;
    if (queries) {
      Object.values(queries).forEach((query) =>
        this.cachedSystemQueryResults.set(query, new Set<Entity>())
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
    this.markForRebuildCachedSystemQuery.forEach((entity) =>
      this.rebuildCacheForEntity(entity)
    );
    this.markForRebuildCachedSystemQuery.clear();

    // Execute all the systems.
    for (const system of this.systems) {
      system.update(elapsedMs, {
        world: this,
        queries: system.queries,
      });
    }
    this.prevTick = tick;

    // Schedule for another execution!
    window.requestAnimationFrame(this.update.bind(this));
  }

  run() {
    this.update(0);
  }
}
