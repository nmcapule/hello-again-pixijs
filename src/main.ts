import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as particlelife from "./particlelife";
import Quadtree from "@timohausmann/quadtree-ts";
import { Circle } from "@timohausmann/quadtree-ts";

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

function particles(color: string, n: number) {
  return particlelife.setupInitialEntities(
    app.stage,
    bounds,
    () => new particlelife.Color(color),
    n
  );
}

let quadtree: Quadtree.Quadtree<Circle<ECS.Entity>> = new Quadtree<
  Circle<ECS.Entity>
>({
  ...bounds,
  // maxObjects: 20,
  // maxLevels: 5,
});
// quadtree = undefined;

new ECS.World()
  .once(particles("green", 500))
  .once(particles("red", 500))
  .once(particles("yellow", 500))
  .register(new particlelife.GraphicsSystem())
  .register(new particlelife.ParticleLifeSystem(100, quadtree))
  .register(new particlelife.MovementSystem(bounds, quadtree))
  .run();

document.body.appendChild(app.view as any);
