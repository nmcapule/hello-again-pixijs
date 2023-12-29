import { Container, Graphics, Rectangle } from "pixi.js";
import * as ECS from "../ecs";
import * as components from "./components";
import { Quadtree } from "../quadtree";

export class QuadtreeRendererSystem extends ECS.System {
  graphics: Graphics;

  constructor(
    readonly stage: Container,
    readonly quadtree: Quadtree<components.Position>
  ) {
    super();

    this.graphics = new Graphics();
    this.stage.addChild(this.graphics);
  }

  update() {
    this.graphics.clear();
    this.graphics.lineStyle(1, 0xffffff);

    const queue = [this.quadtree];
    while (queue.length > 0) {
      const qt = queue.pop()!;
      this.graphics.drawRect(
        qt?.bounds.x,
        qt?.bounds.y,
        qt?.bounds.width,
        qt?.bounds.height
      );
      if (qt.nodes) {
        queue.push(...qt.nodes);
      }
    }
  }
}

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
    this.quadtree?.clear();

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
    readonly rules: [string, string, number][],
    readonly quadtree?: Quadtree<components.Position>,
    readonly searchSize = 30,
    readonly stepSize: number = 1
  ) {
    super();
  }

  private applyRule(
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
      if (d > 0 && d < this.searchSize) {
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

    const accel = this.stepSize; //* elapsed / 1000;

    if (!this.quadtree) {
      particles.sort(([_a, [a]], [_b, [b]]) => a.state.x - b.state.x);
    }

    for (const [i, [_, particle]] of particles.entries()) {
      let neighbors: [
        components.Position,
        components.Velocity,
        components.Color
      ][] = [];
      if (this.quadtree) {
        neighbors = this.quadtree
          .retrieve(
            new Rectangle(
              particle[0].state.x - this.searchSize,
              particle[0].state.y - this.searchSize,
              this.searchSize * 2,
              this.searchSize * 2
            )
          )
          .map((component) =>
            this.queries.Particle.components(world, component.id)
          );
      } else {
        neighbors = particles
          .map(([_, particle]) => particle)
          .filter(
            ([pos]) =>
              Math.abs(pos.state.x - particle[0].state.x) <= 80 &&
              Math.abs(pos.state.y - particle[0].state.y) <= 80
          );
      }

      for (const [a, b, g] of this.rules) {
        this.applyRule(particle, neighbors, a, b, g);
      }
    }
  }
}
