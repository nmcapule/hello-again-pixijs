import * as PIXI from "pixi.js";
import * as ECS from "./ecs/main";

class Vec2 {
  x = 0;
  y = 0;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  get length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
  normalize() {
    const len = this.length;
    if (len === 0) {
      return new Vec2(0, 0);
    }
    return new Vec2(this.x / len, this.y / len);
  }
  multiply(v: number) {
    return new Vec2(this.x * v, this.y * v);
  }
}

const app = new PIXI.Application({
  background: "#1099bb",
  width: 800,
  height: 640,
});

function createPlaceholderGraphics(color: number) {
  const playerGraphics = new PIXI.Graphics();
  playerGraphics.beginFill(color);
  playerGraphics.drawCircle(0, 0, 4);
  // playerGraphics.drawRect(-8, -8, 16, 16);
  return playerGraphics;
}

const world = new ECS.World();

world.register(
  new ECS.System({
    queries: {
      positionable: new ECS.Query<[{ x: number; y: number }, PIXI.Graphics]>([
        "position",
        "graphics",
      ]),
    },
    updateProxy: (self) => (world: ECS.World, elapsed: number) => {
      const query = self.queries.positionable;
      const entities = query.execute(world);
      for (const entity of entities) {
        const [position, graphics] = query.select(world, entity);
        graphics.state.x = position.state.x;
        graphics.state.y = position.state.y;

        position.state.x += ((Math.random() - 0.5) * elapsed) / 10;
        position.state.y += ((Math.random() - 0.5) * elapsed) / 10;
        position.state.x = Math.min(Math.max(0, position.state.x), 800);
        position.state.y = Math.min(Math.max(0, position.state.y), 640);
      }
    },
  })
);

world.register(
  new ECS.System({
    queries: {
      positionable: new ECS.Query<[{ x: number; y: number }, PIXI.Graphics]>([
        "position",
        "graphics",
      ]),
    },
    updateProxy: (self) => (world: ECS.World, elapsed: number) => {
      const query = self.queries.positionable;

      const entities = Array.from(query.execute(world));
      if (entities.length === 0) {
        return;
      }

      const targetPopulation = 1000;

      // Calculate percentage of cloning!
      const numberToClone =
        (Math.random() * elapsed * targetPopulation) / entities.length;
      // Sample entities.
      for (let i = 1; i < numberToClone; i++) {
        const index = Math.floor(Math.random() * entities.length);
        const entity = entities[index];
        const [position, graphics] = query.select(world, entity);
        const clonedGraphics = graphics.state.clone();
        world.spawn(
          null,
          new ECS.Component("position", { ...position.state }),
          new ECS.Component("graphics", clonedGraphics, {
            doneProxy: (self) => () => clonedGraphics.removeFromParent(),
          })
        );
        app.stage.addChild(clonedGraphics);
      }

      // Calculate percentage of despawning!
      const numberToDespawn =
        (Math.random() * elapsed * entities.length) / targetPopulation;
      for (let i = 1; i < numberToDespawn; i++) {
        const index = Math.floor(Math.random() * entities.length);
        world.despawn(entities[index]);
      }
    },
  })
);

world.run();

for (let i = 0; i < 10000; i++) {
  const graphics = createPlaceholderGraphics(Math.random() * 0xffffff);
  world.spawn(
    null,
    new ECS.Component("position", {
      x: Math.random() * 800,
      y: Math.random() * 640,
    }),
    new ECS.Component("graphics", graphics, {
      doneProxy: (self) => () => graphics.removeFromParent(),
    })
  );
  app.stage.addChild(graphics);
}

document.body.appendChild(app.view as any);
