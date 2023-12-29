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

// const quadtree = new Quadtree(bounds);
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// quadtree.insert({ x: 1, y: 2, id: 1 });
// console.log(quadtree.entities);

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
  .once(particles("green", 100))
  .once(particles("red", 100))
  .once(particles("yellow", 100))
  .register(new particlelife.GraphicsSystem())
  .register(new particlelife.ParticleLifeSystem(quadtree, 100))
  .register(new particlelife.MovementSystem(bounds, quadtree))
  .run();

document.body.appendChild(app.view as any);
