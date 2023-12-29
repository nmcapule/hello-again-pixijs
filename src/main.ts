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

// this.rule(particle, neighbors, "green", "green", -0.32 * accel);
// this.rule(particle, neighbors, "green", "red", -0.17 * accel);
// this.rule(particle, neighbors, "green", "yellow", 0.34 * accel);
// this.rule(particle, neighbors, "red", "red", -0.1 * accel);
// this.rule(particle, neighbors, "red", "green", -0.34 * accel);
// this.rule(particle, neighbors, "yellow", "yellow", 0.15 * accel);
// this.rule(particle, neighbors, "yellow", "green", -0.2 * accel);

let quadtree = new Quadtree<particlelife.Position>(bounds);

const colors = ["green", "red", "yellow", "white"];
const n = 500;
const searchSize = 80;
const stepSize = 1;

const world = new ECS.World();
for (const color of colors) {
  world.once(particles(color, n));
}
world
  .register(new particlelife.GraphicsSystem())
  .register(
    new particlelife.ParticleLifeSystem(
      colors
        .map((color) =>
          colors.map(
            (other) =>
              [color, other, Math.random() * 2 - 1] as [string, string, number]
          )
        )
        .flat(),
      quadtree,
      searchSize,
      stepSize
    )
  )
  .register(new particlelife.MovementSystem(bounds, quadtree))
  .run();

document.body.appendChild(app.view as any);
