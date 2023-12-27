import * as PIXI from "pixi.js";
import * as ECS from "../ecs";
import * as components from "./components";

const Spatial = new ECS.Query([components.Position, components.Graphics]);

export class SporadicMovementSystem extends ECS.System {
  queries = { Spatial };

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
    SpatialAndNamed: new ECS.Query([
      components.Position,
      components.Graphics,
      components.Named,
    ]),
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

// export class SpawnDespawnSystem extends ECS.System {
//   queries = {
//     SpatialAndNamed: new ECS.Query([
//       components.Position,
//       components.Graphics,
//       components.Named,
//     ]),
//   };

//   constructor(
//     readonly stage: PIXI.Container,
//     readonly targetPopulation = 1000
//   ) {
//     super();
//   }

//   update(world: ECS.World, elapsed: number) {
//     const matches = this.queries.SpatialAndNamed.execute(world);
//     if (matches.length === 0) {
//       return;
//     }

//     const control = Math.max(elapsed, 100);

//     // Calculate percentage of cloning!
//     const numberToClone =
//       (Math.random() * control * this.targetPopulation) / matches.length;
//     // Sample entities.
//     for (let i = 1; i < numberToClone; i++) {
//       const index = Math.floor(Math.random() * matches.length);
//       const [_, [position, graphics, name]] = matches[index];
//       const clonedGraphics = graphics.state.clone();
//       world.spawn(
//         new components.Position({ ...position.state }),
//         new components.Graphics(clonedGraphics, this.stage),
//         new components.Named(name.state)
//       );
//       this.stage.addChild(clonedGraphics);
//     }

//     // Calculate percentage of despawning!
//     const numberToDespawn =
//       (Math.random() * control * matches.length) / this.targetPopulation;
//     for (let i = 1; i < numberToDespawn; i++) {
//       const index = Math.floor(Math.random() * matches.length);
//       const [entity] = matches[index];
//       world.despawn(entity);
//     }
//   }
// }

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
    for (const [a, [positionA, nameA]] of entitySet) {
      for (const [b, [positionB, nameB]] of entitySet) {
        if (a === b) {
          continue;
        }

        const distance = Math.sqrt(
          (positionA.state.x - positionB.state.x) ** 2 +
            (positionA.state.y - positionB.state.y) ** 2
        );
        if (distance < this.collisionDistance && nameA.state !== nameB.state) {
          world.despawn(a);
          world.despawn(b);
        }
      }
    }
  }
}
