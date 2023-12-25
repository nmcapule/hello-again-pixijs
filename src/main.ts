import * as PIXI from "pixi.js";
import * as ECS from "./ecs";

class Vec2 {
  x = 0;
  y = 0;
  static of(x = 0, y = 0) {
    const v = new Vec2();
    v.x = x;
    v.y = y;
    return v;
  }
  get length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
  normalize() {
    const len = this.length;
    if (len === 0) {
      return Vec2.of(0, 0);
    }
    return Vec2.of(this.x / len, this.y / len);
  }
  multiply(v: number) {
    return Vec2.of(this.x * v, this.y * v);
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
  playerGraphics.drawCircle(0, 0, 2);
  // playerGraphics.drawRect(-8, -8, 16, 16);
  return playerGraphics;
}

const QUERIES = {
  spatial: ECS.q<[{ x: number; y: number }, PIXI.Graphics]>([
    "position",
    "graphics",
  ]),
};
const sporadicMovementSystem = ECS.s((world: ECS.World, elapsed: number) => {
  const query = QUERIES.spatial;
  for (const [_, [position, graphics]] of query.execute(world)) {
    graphics.state.x = position.state.x;
    graphics.state.y = position.state.y;

    position.state.x += ((Math.random() - 0.5) * elapsed) / 10;
    position.state.y += ((Math.random() - 0.5) * elapsed) / 10;
    position.state.x = Math.min(Math.max(0, position.state.x), 800);
    position.state.y = Math.min(Math.max(0, position.state.y), 640);
  }
});
const spawnDespawnSystem = ECS.s((world: ECS.World, elapsed: number) => {
  const targetPopulation = 10000;
  const query = QUERIES.spatial;

  const matches = query.execute(world);
  if (matches.length === 0) {
    return;
  }

  // Calculate percentage of cloning!
  const numberToClone =
    (Math.random() * elapsed * targetPopulation) / matches.length;
  // Sample entities.
  for (let i = 1; i < numberToClone; i++) {
    const index = Math.floor(Math.random() * matches.length);
    const [_, [position, graphics]] = matches[index];
    const clonedGraphics = graphics.state.clone();
    world.spawn(
      null,
      ECS.c("position", { ...position.state }),
      ECS.c("graphics", clonedGraphics, {
        init: () => app.stage.addChild(clonedGraphics),
        done: () => clonedGraphics.removeFromParent(),
      })
    );
    app.stage.addChild(clonedGraphics);
  }

  // Calculate percentage of despawning!
  const numberToDespawn =
    (Math.random() * elapsed * matches.length) / targetPopulation;
  for (let i = 1; i < numberToDespawn; i++) {
    const index = Math.floor(Math.random() * matches.length);
    const [entity] = matches[index];
    world.despawn(entity);
  }
});

const world = new ECS.World()
  .prepare(QUERIES.spatial)
  .register(sporadicMovementSystem)
  .register(spawnDespawnSystem)
  .run();

for (let i = 0; i < 10; i++) {
  const graphics = createPlaceholderGraphics(Math.random() * 0xffffff);
  world.spawn(
    null,
    ECS.c("position", {
      x: Math.random() * 800,
      y: Math.random() * 640,
    }),
    ECS.c("graphics", graphics, {
      init: () => app.stage.addChild(graphics),
      done: () => graphics.removeFromParent(),
    })
  );
}

document.body.appendChild(app.view as any);
