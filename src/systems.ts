import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as components from "./components";
import * as queries from "./queries";

export class SporadicMovementSystem extends ECS.System {
  update(world: ECS.World, elapsed: number) {
    const query = queries.Spatial;
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

export class SpawnDespawnSystem extends ECS.System {
  constructor(readonly stage: PIXI.Container) {
    super();
  }
  update(world: ECS.World, elapsed: number) {
    const targetPopulation = 1000;
    const query = queries.Spatial;

    const matches = query.execute(world);
    if (matches.length === 0) {
      return;
    }

    const control = Math.max(elapsed, 100);

    // Calculate percentage of cloning!
    const numberToClone =
      (Math.random() * control * targetPopulation) / matches.length;
    // Sample entities.
    for (let i = 1; i < numberToClone; i++) {
      const index = Math.floor(Math.random() * matches.length);
      const [_, [position, graphics]] = matches[index];
      const clonedGraphics = graphics.state.clone();
      world.spawn(
        new components.Position({ ...position.state }),
        new components.Graphics(
          clonedGraphics,
          () => this.stage.addChild(clonedGraphics),
          () => clonedGraphics.removeFromParent()
        )
      );
      this.stage.addChild(clonedGraphics);
    }

    // Calculate percentage of despawning!
    const numberToDespawn =
      (Math.random() * control * matches.length) / targetPopulation;
    for (let i = 1; i < numberToDespawn; i++) {
      const index = Math.floor(Math.random() * matches.length);
      const [entity] = matches[index];
      world.despawn(entity);
    }
  }
}