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
world.register({
  queries: {
    positionable: { required: ["position", "graphics"] },
  },
  update: (elapsed: number, { world, queries }) => {
    const entities = world.execute(queries?.positionable!);
    for (const entity of entities) {
      const [position, graphics] = world.select<[any, PIXI.Graphics]>(entity, [
        "position",
        "graphics",
      ]);
      graphics.x = position.x;
      graphics.y = position.y;

      position.x += ((Math.random() - 0.5) * elapsed) / 10;
      position.y += ((Math.random() - 0.5) * elapsed) / 10;
      position.x = Math.min(Math.max(0, position.x), 800);
      position.y = Math.min(Math.max(0, position.y), 640);
    }
  },
});
world.register({
  queries: {
    positionable: { required: ["position", "graphics"] },
  },
  update: (elapsed: number, { world, queries }) => {
    const entities = Array.from(world.execute(queries?.positionable!));

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
      const [position, graphics, name] = world.select<
        [any, PIXI.Graphics, string]
      >(entity, ["position", "graphics", "name"]);
      const clonedGraphics = graphics.clone();
      world.spawn(
        null,
        ECS.c("position", { ...position }),
        ECS.c("name", `cloned ${name}`),
        ECS.c("graphics", clonedGraphics, () =>
          clonedGraphics.removeFromParent()
        )
      );
      app.stage.addChild(graphics);
    }

    // Calculate percentage of despawning!
    const numberToDespawn =
      (Math.random() * elapsed * entities.length) / targetPopulation;
    for (let i = 1; i < numberToDespawn; i++) {
      const index = Math.floor(Math.random() * entities.length);
      world.despawn(entities[index]);
    }
  },
});
world.run();

for (let i = 0; i < 10000; i++) {
  const graphics = createPlaceholderGraphics(Math.random() * 0xffffff);
  world.spawn(
    null,
    ECS.c("position", { x: Math.random() * 800, y: Math.random() * 640 }),
    ECS.c("name", `grunt#${i}`),
    ECS.c("graphics", graphics, () => graphics.removeFromParent())
  );
  app.stage.addChild(graphics);
}

document.body.appendChild(app.view as any);
