import { Rectangle } from "pixi.js";
import * as ECS from "../ecs";
import * as components from "./components";
import { Quadtree } from "../quadtree";

export class GraphicsSystem extends ECS.System {
  queries = {
    Drawable: new ECS.Query([components.Position, components.Graphics]),
  };
  update(world: ECS.World) {
    const entities = this.queries.Drawable.execute(world);
    for (const [_, [p, g]] of entities) {
      g.state.x = p.state.x;
      g.state.y = p.state.y;
    }
  }
}

export class MovementSystem extends ECS.System {
  queries = {
    Particles: new ECS.Query([components.Position, components.Velocity]),
  };
  constructor(
    readonly bounds: Rectangle,
    readonly quadtree?: Quadtree<components.Position>
  ) {
    super();
  }

  update(world: ECS.World) {
    for (const [_, [p, v]] of this.queries.Particles.execute(world)) {
      let nx = p.state.x + v.state.vx;
      let ny = p.state.y + v.state.vy;
      if (nx < this.bounds.left) {
        nx = this.bounds.right;
      }
      if (nx > this.bounds.right) {
        nx = this.bounds.left;
      }
      if (ny < this.bounds.top) {
        ny = this.bounds.bottom;
      }
      if (ny > this.bounds.bottom) {
        ny = this.bounds.top;
      }

      this.quadtree?.remove(p);
      p.state.x = nx;
      p.state.y = ny;
      this.quadtree?.insert(p);
    }
  }
}

export class ParticleLifeSystem extends ECS.System {
  queries = {
    Particle: new ECS.Query([
      components.Position,
      components.Velocity,
      components.Color<string>,
    ]),
  };

  constructor(
    readonly simulationMultiplier: number = 100,
    readonly quadtree?: Quadtree<components.Position>
  ) {
    super();
  }

  private rule(
    [ap, av, ac]: [components.Position, components.Velocity, components.Color],
    bb: [components.Position, components.Velocity, components.Color][],
    fac: string,
    fbc: string,
    g: number
  ) {
    if (ac.state !== fac) {
      return;
    }

    let fx = 0;
    let fy = 0;

    for (const [bp, _bv, bc] of bb) {
      if (bc.state !== fbc) {
        continue;
      }

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

  update(world: ECS.World, elapsed: number) {
    const particles = this.queries.Particle.execute(world);

    const accel = (this.simulationMultiplier * elapsed) / 1000;

    for (const [_, particle] of particles) {
      let neighbors: [
        components.Position,
        components.Velocity,
        components.Color
      ][] = [];
      if (this.quadtree) {
        neighbors = this.quadtree
          .find(new Rectangle(particle[0].x - 40, particle[0].y - 40, 80, 80))
          .map((bv) => bv.id)
          .map((entity) => this.queries.Particle.components(world, entity));
      } else {
        neighbors = particles
          .map(([_, particle]) => particle)
          .filter(
            ([pos]) =>
              Math.abs(pos.state.x - particle[0].state.x) <= 80 &&
              Math.abs(pos.state.y - particle[0].state.y) <= 80
          );
      }

      this.rule(particle, neighbors, "green", "green", -0.32 * accel);
      this.rule(particle, neighbors, "green", "red", -0.17 * accel);
      this.rule(particle, neighbors, "green", "yellow", 0.34 * accel);
      this.rule(particle, neighbors, "red", "red", -0.1 * accel);
      this.rule(particle, neighbors, "red", "green", -0.34 * accel);
      this.rule(particle, neighbors, "yellow", "yellow", 0.15 * accel);
      this.rule(particle, neighbors, "yellow", "green", -0.2 * accel);
    }
  }
}
