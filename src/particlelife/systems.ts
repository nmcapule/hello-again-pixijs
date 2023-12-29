import { Rectangle } from "pixi.js";
import * as ECS from "../ecs";
import * as components from "./components";

export class GraphicsSystem extends ECS.System {
  queries = {
    Drawable: new ECS.Query([components.Position, components.Graphics]),
  };
  update(world: ECS.World) {
    for (const [_, [p, g]] of this.queries.Drawable.execute(world)) {
      g.state.x = p.state.x;
      g.state.y = p.state.y;
    }
  }
}

export class MovementSystem extends ECS.System {
  queries = {
    Particles: new ECS.Query([components.Position, components.Velocity]),
  };
  constructor(readonly bounds: Rectangle) {
    super();
  }

  update(world: ECS.World) {
    for (const [_, [p, v]] of this.queries.Particles.execute(world)) {
      p.state.x += v.state.vx;
      p.state.y += v.state.vy;
      if (p.state.x < this.bounds.left) {
        p.state.x = this.bounds.right;
      }
      if (p.state.x > this.bounds.right) {
        p.state.x = this.bounds.left;
      }
      if (p.state.y < this.bounds.top) {
        p.state.y = this.bounds.bottom;
      }
      if (p.state.y > this.bounds.bottom) {
        p.state.y = this.bounds.top;
      }
    }
  }
}

export class ParticleLifeSystem extends ECS.System {
  queries = {
    Red: new ECS.Query([
      components.Position,
      components.Velocity,
      components.RedColor,
    ]),
    Green: new ECS.Query([
      components.Position,
      components.Velocity,
      components.GreenColor,
    ]),
    Yellow: new ECS.Query([
      components.Position,
      components.Velocity,
      components.YellowColor,
    ]),
  };

  constructor(readonly simulationMultiplier: number = 100) {
    super();
  }

  private rule(
    aa: [ECS.Entity, [components.Position, components.Velocity, any]][],
    bb: [ECS.Entity, [components.Position, components.Velocity, any]][],
    g: number
  ) {
    for (const [_, [ap, av]] of aa) {
      let fx = 0;
      let fy = 0;
      for (const [_, [bp]] of bb) {
        const dx = ap.state.x - bp.state.x;
        const dy = ap.state.y - bp.state.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0 && d < 80) {
          const F = (g * 1) / d;
          fx += F * dx;
          fy += F * dy;
        }
      }
      av.state.vx = (av.state.vx + fx) * 0.5;
      av.state.vy = (av.state.vy + fy) * 0.5;
    }
  }

  update(world: ECS.World, elapsed: number) {
    const yellow = this.queries.Yellow.execute(world);
    const red = this.queries.Red.execute(world);
    const green = this.queries.Green.execute(world);

    const accel = (this.simulationMultiplier * elapsed) / 1000;

    this.rule(green, green, -0.32 * accel);
    this.rule(green, red, -0.17 * accel);
    this.rule(green, yellow, 0.34 * accel);
    this.rule(red, red, -0.1 * accel);
    this.rule(red, green, -0.34 * accel);
    this.rule(yellow, yellow, 0.15 * accel);
    this.rule(yellow, green, -0.2 * accel);
  }
}
