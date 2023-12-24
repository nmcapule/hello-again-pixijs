export type Entity = number;

export interface Component {
  name: string;
  state: any;
}

export function c(name: string, state?: any): Component {
  return { name, state };
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
      queries: { [key: string]: Query };
    }
  );
}

interface WorldEntity {
  entity: Entity;
  components: Map<string, Component>;
}

export class World {
  private systems: System[] = [];
  private entities = new Map<Entity, WorldEntity>();
  private entityIdGenerator = 0;
  private cachedSystemQueryResults = new Map<Query, Set<Entity>>();

  instance(entity: Entity): WorldEntity {
    return this.entities.get(entity)!;
  }
  components(entity: Entity): Map<string, Component> {
    return this.instance(entity).components;
  }
  execute(query: Query): Set<Entity> {
    return this.cachedSystemQueryResults.get(query)!;
  }
  // query(...componentNames: string[]): Entity[] {
  //   const matches: Entity[] = [];
  //   for (const [entity, instance] of this.entities.entries()) {
  //     const instanceComponents = Array.from(instance.components.keys());
  //     if (componentNames.every((name) => instanceComponents.includes(name))) {
  //       matches.push(entity);
  //     }
  //   }
  //   return matches;
  // }

  spawn(entity: Entity | null, ...components: Component[]): Entity {
    if (entity === null) {
      entity = ++this.entityIdGenerator;
    }
    this.entities.set(entity, {
      entity,
      components: new Map<string, Component>(),
    });
    components.forEach((component) => {
      this.addComponent(entity!, component, false);
    });
    this.rebuildCachedSystemQueryResults(entity);
    return entity;
  }
  despawn(entity: Entity) {
    this.components(entity)?.forEach((component) =>
      this.removeComponent(entity, component, false)
    );
    this.rebuildCachedSystemQueryResults(entity);
    this.entities.delete(entity);
  }
  addComponent(entity: Entity, component: Component, rebuildCache = true) {
    this.components(entity).set(component.name, component);
    if (rebuildCache) {
      this.rebuildCachedSystemQueryResults(entity);
    }
  }
  removeComponent(entity: Entity, component: Component, rebuildCache = true) {
    this.components(entity).delete(component.name);
    if (rebuildCache) {
      this.rebuildCachedSystemQueryResults(entity);
    }
  }

  private queryMatches(query: Query, instance: WorldEntity) {
    const instanceComponentNames = Array.from(instance.components.keys());
    return query.required.every((componentName) =>
      instanceComponentNames.includes(componentName)
    );
  }
  private rebuildCachedSystemQueryResults(entity: Entity) {
    this.cachedSystemQueryResults.forEach((cachedResults, query) => {
      const match = this.queryMatches(query, this.instance(entity));
      if (match) {
        cachedResults.add(entity);
      } else {
        cachedResults.delete(entity);
      }
    });
  }

  registerSystem(system: System): World {
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
    for (const system of this.systems) {
      system.update(elapsedMs, {
        world: this,
        queries: system.queries,
      });
    }
    this.prevTick = tick;
    window.requestAnimationFrame(this.update.bind(this));
  }

  run() {
    this.update(0);
  }
}
