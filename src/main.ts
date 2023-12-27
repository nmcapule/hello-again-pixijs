import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as spawner from "./spawner";

const app = new PIXI.Application({
  background: "#1099bb",
  width: 800,
  height: 640,
});

class LoggerSystem extends ECS.System {
  update(_, elapsed: number) {
    console.log(`tick:`, elapsed);
  }
}

new ECS.World()
  .once(spawner.setupInitialEntities(app.stage, 10))
  .register(new spawner.SporadicMovementSystem())
  .register(new spawner.SpawnSystem(app.stage, 1000))
  // .register(new spawner.SpawnDespawnSystem(app.stage, 10))
  .register(new spawner.CollisionDetectSystem(4))
  .register(new LoggerSystem())
  .run();

document.body.appendChild(app.view as any);
