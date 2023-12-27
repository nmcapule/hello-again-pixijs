import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as spawner from "./spawner";

const app = new PIXI.Application({
  background: "#1099bb",
  width: 800,
  height: 640,
});

new ECS.World()
  .once(spawner.setupInitialEntities(app.stage))
  .register(new spawner.SporadicMovementSystem())
  .register(new spawner.SpawnDespawnSystem(app.stage, 10000))
  .run();

document.body.appendChild(app.view as any);
