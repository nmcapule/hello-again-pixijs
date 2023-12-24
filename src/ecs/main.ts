export type Entity = number;

export interface Component {
  name: string;
  state: any;
}

export function c(name: string, state?: any): Component {
  return { name, state };
}

export interface System {
  update(elapsedMs: number);
}

interface WorldEntity {
  entity: Entity;
  components: Map<string, Component>;
}

export class World {
  private systems: System[] = [];
  private entities = new Map<Entity, WorldEntity>();
  private entityGenerator = 0;

  components(entity: Entity): Map<string, Component> {
    return this.entities.get(entity)!.components;
  }
  query(...components: Component[]): Entity[] {
    // TODO: This is the naive implementation. Make faster by lookups.
    const componentNames = components.map((c) => c.name);
    const matches: Entity[] = [];
    for (const [entity, instance] of this.entities.entries()) {
      const instanceComponents = Array.from(instance.components.keys());
      if (componentNames.every((name) => instanceComponents.includes(name))) {
        matches.push(entity);
      }
    }
    return matches;
  }

  spawn(entity: Entity | null, ...components: Component[]): Entity {
    if (entity === null) {
      entity = ++this.entityGenerator;
    }
    this.entities.set(entity, {
      entity,
      components: new Map<string, Component>(),
    });
    for (const component of components) {
      this.addComponent(entity, component);
    }
    return entity;
  }
  despawn(entity: Entity) {
    this.components(entity)?.forEach((component) =>
      this.removeComponent(entity, component)
    );
    this.entities.delete(entity);
  }
  addComponent(entity: Entity, component: Component) {
    this.entities.get(entity)?.components.set(component.name, component);
    // TODO: Rebuild lookup table.
  }
  removeComponent(entity: Entity, component: Component) {
    this.entities.get(entity)?.components.delete(component.name);
    // TODO: Rebuild lookup table.
  }

  registerSystem(system: System): World {
    this.systems.push(system);
    return this;
  }

  private prevTick: number = 0;
  private update(tick: number) {
    const elapsedMs = tick - this.prevTick;
    for (const system of this.systems) {
      system.update(elapsedMs);
    }
    this.prevTick = tick;
    window.requestAnimationFrame(this.update.bind(this));
  }

  run() {
    this.update(0);
  }
}
