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
  playerGraphics.drawRect(-8, -8, 16, 16);
  return playerGraphics;
}

const world = new ECS.World();
for (let i = 0; i < 100; i++) {
  const graphics = createPlaceholderGraphics(0x000000);
  world.spawn(
    null,
    ECS.c("position", { x: Math.random() * 800, y: Math.random() * 640 }),
    ECS.c("name", `grunt#${i}`),
    ECS.c("graphics", graphics)
  );
  app.stage.addChild(graphics);
}
world.registerSystem({
  update: (elapsed: number) => {
    const entities = world.query(
      ECS.c("position"),
      ECS.c("name"),
      ECS.c("graphics")
    );
    for (const entity of entities) {
      const components = world.components(entity);
      const position = components.get("position")!.state as {
        x: number;
        y: number;
      };
      const graphics = components.get("graphics")!.state as PIXI.Graphics;
      graphics.x = position.x;
      graphics.y = position.y;

      position.x += (Math.random() - 0.5) * elapsed;
      position.y += (Math.random() - 0.5) * elapsed;
      position.x = Math.min(Math.max(0, position.x), 800);
      position.y = Math.min(Math.max(0, position.y), 640);
    }
    // console.log(elapsed, entities);
  },
});
world.run();

document.body.appendChild(app.view as any);
