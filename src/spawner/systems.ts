import * as PIXI from "pixi.js";
import * as ECS from "../ecs";
import * as components from "./components";
import * as events from "./events";

const Spatial = new ECS.Query([components.Position, components.Graphics]);

export class SporadicMovementSystem extends ECS.System {
  queries = {
    Spatial: new ECS.Query([components.Position, components.Graphics]),
  };

  update(world: ECS.World, elapsed: number) {
    const query = this.queries.Spatial;
    for (const [_, [position, graphics]] of query.execute(world)) {
      graphics.state.x = position.state.x;
      graphics.state.y = position.state.y;

      position.state.x += ((Math.random() - 0.5) * elapsed) / 10;
      position.state.y += ((Math.random() - 0.5) * elapsed) / 10;
      position.state.x = Math.min(Math.max(0, position.state.x), 800);
      position.state.y = Math.min(Math.max(0, position.state.y), 640);
    }
  }
}

export class SpawnSystem extends ECS.System {
  queries = {
    SpatialAndNamed: new ECS.Query(
      [components.Position, components.Graphics, components.Named],
      (lookup) => {
        const name = lookup.get(components.Named.name) as components.Named;
        return ["instance#1", "instance#2"].includes(name.state);
      }
    ),
  };

  constructor(
    readonly stage: PIXI.Container,
    readonly targetPopulation = 1000
  ) {
    super();
  }

  update(world: ECS.World, elapsed: number) {
    const matches = this.queries.SpatialAndNamed.execute(world);
    if (matches.length === 0) {
      return;
    }

    // Calculate percentage of cloning!
    const numberToClone = Math.min(
      Math.random() * (this.targetPopulation - matches.length) * 2,
      100
    );

    // console.log(`entities: ${matches.length}, spawn:${numberToClone}`);

    // Sample entities.
    for (let i = 1; i < numberToClone; i++) {
      const index = Math.floor(Math.random() * matches.length);
      const [_, [position, graphics, name]] = matches[index];
      const clonedGraphics = graphics.state.clone();
      world.spawn(
        new components.Position({ ...position.state }),
        new components.Graphics(clonedGraphics, this.stage),
        new components.Named(name.state)
      );
      this.stage.addChild(clonedGraphics);
    }
  }
}

export class CollisionDetectSystem extends ECS.System {
  queries = {
    SpatialAndNamed: new ECS.Query([components.Position, components.Named]),
  };
  constructor(readonly collisionDistance = 8) {
    super();
  }
  update(world: ECS.World, _: number) {
    const query = this.queries.SpatialAndNamed;
    const entitySet = query.execute(world);

    const sorted = entitySet.sort(([_a, [posA]], [_b, [posB]]) => {
      return posA.state.x - posB.state.x;
    });

    for (const [i, [a, [positionA, nameA]]] of sorted.entries()) {
      // Look left
      for (let j = i - 1; j >= 0; j--) {
        const [b, [posB, nameB]] = sorted[j];
        const distance = Math.sqrt(
          (positionA.state.x - posB.state.x) ** 2 +
            (positionA.state.y - posB.state.y) ** 2
        );
        if (distance < this.collisionDistance && nameA.state !== nameB.state) {
          world.despawn(a);
          world.despawn(b);
        } else {
          break;
        }
      }
      // Look right
      for (let j = i + 1; j < sorted.length; j++) {
        const [b, [posB, nameB]] = sorted[j];
        const distance = Math.sqrt(
          (positionA.state.x - posB.state.x) ** 2 +
            (positionA.state.y - posB.state.y) ** 2
        );
        if (distance < this.collisionDistance && nameA.state !== nameB.state) {
          world.despawn(a);
          world.despawn(b);
          world.send(
            new events.Log(
              `despawned ${nameA.state}:${a} and ${nameB.state}:${b}`
            )
          );
        } else {
          break;
        }
      }
    }
  }
}

export class EventLoggerSystem extends ECS.System {
  queries = { Spatial };
  listener = new ECS.SystemEventListener([events.Log]);

  update(world: ECS.World) {
    const [logs] = this.listener.events(world);
    console.log(...logs.map((l) => l.data));
    console.log("entities:", this.queries.Spatial.find(world).size);
  }
}
