import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as particlelife from "./particlelife";

const bounds = new PIXI.Rectangle(
  0,
  0,
  document.body.clientWidth,
  document.body.clientHeight
);

const app = new PIXI.Application({
  background: "#000",
  width: bounds.width,
  height: bounds.height,
});

new ECS.World()
  .once(
    particlelife.setupInitialEntities(
      app.stage,
      bounds,
      particlelife.GreenColor,
      500
    )
  )
  .once(
    particlelife.setupInitialEntities(
      app.stage,
      bounds,
      particlelife.RedColor,
      500
    )
  )
  .once(
    particlelife.setupInitialEntities(
      app.stage,
      bounds,
      particlelife.YellowColor,
      500
    )
  )
  .register(new particlelife.GraphicsSystem())
  .register(new particlelife.ParticleLifeSystem())
  .register(new particlelife.MovementSystem(bounds))
  .run();

document.body.appendChild(app.view as any);
