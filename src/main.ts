import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as particlelife from "./particlelife";

const bounds = new PIXI.Rectangle(
  0,
  0,
  document.body.clientWidth,
  document.body.clientHeight
);

import { Quadtree } from "./quadtree";

const app = new PIXI.Application({
  background: "#000",
  width: bounds.width,
  height: bounds.height,
});

function particles(color: string, n: number) {
  return particlelife.setupInitialEntities(
    app.stage,
    bounds,
    () => new particlelife.Color(color),
    n
  );
}

const quadtree = new Quadtree<particlelife.Position>(bounds);
new ECS.World()
  .once(particles("green", 500))
  .once(particles("red", 500))
  .once(particles("yellow", 500))
  .register(new particlelife.GraphicsSystem())
  .register(new particlelife.ParticleLifeSystem(100))
  .register(new particlelife.MovementSystem(bounds))
  .run();

document.body.appendChild(app.view as any);
