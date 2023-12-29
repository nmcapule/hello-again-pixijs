import * as PIXI from "pixi.js";
import * as ECS from "./ecs";
import * as particlelife from "./particlelife";
import { Quadtree } from "./quadtree";

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

let quadtree = new Quadtree<particlelife.Position>(bounds);

const colors = ["green", "red", "yellow", "white"];
const n = 500;
const searchSize = 80;
const stepSize = 60;
const rules = colors
  .map((color) =>
    colors.map(
      (other) =>
        [color, other, Math.random() * 2 - 1] as [string, string, number]
    )
  )
  .flat();

const world = new ECS.World();
for (const color of colors) {
  world.once(particles(color, n));
}
world
  .register(new particlelife.GraphicsSystem())
  .register(new particlelife.ParticleLifeSystem(rules, quadtree, searchSize))
  .register(new particlelife.MovementSystem(bounds, quadtree, stepSize))
  .register(new particlelife.QuadtreeRendererSystem(app.stage, quadtree))
  .run();

document.body.appendChild(app.view as any);
