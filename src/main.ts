import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as components from "./components";
import * as queries from "./queries";
import * as systems from "./systems";

const app = new PIXI.Application({
  background: "#1099bb",
  width: 800,
  height: 640,
});

const world = new ECS.World()
  .prepare(queries.Spatial)
  .register(new systems.SporadicMovementSystem())
  .register(new systems.SpawnDespawnSystem(app.stage))
  .run();

function createPlaceholderGraphics(color: number) {
  const playerGraphics = new PIXI.Graphics();
  playerGraphics.beginFill(color);
  playerGraphics.drawCircle(0, 0, 2);
  return playerGraphics;
}

for (let i = 0; i < 1000; i++) {
  const graphics = createPlaceholderGraphics(Math.random() * 0xffffff);
  world.spawn(
    new components.Position({
      x: Math.random() * 800,
      y: Math.random() * 640,
    }),
    new components.Graphics(
      graphics,
      () => app.stage.addChild(graphics),
      () => graphics.removeFromParent()
    )
  );
}

document.body.appendChild(app.view as any);
