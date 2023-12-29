import * as PIXI from "pixi.js";

export interface Entity {
  x: number;
  y: number;
  id?: any;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;

  contains(x: number, y: number): boolean;
  intersects(other: Bounds): boolean;
}

function rect(x, y, width, height): Bounds {
  return new PIXI.Rectangle(x, y, width, height);
}

export class Quadtree<T extends Entity> {
  nodes: [Quadtree<T>, Quadtree<T>, Quadtree<T>, Quadtree<T>] | null;
  entities: T[] = [];

  constructor(readonly bounds: Bounds, readonly maxN = 5) {}

  insert(entity: T) {
    if (!this.nodes?.length) {
      if (this.entities.length < this.maxN) {
        this.entities.push(entity);
        return;
      }
      this.subdivide();
    }
    for (const node of this.nodes!) {
      if (!node.bounds.contains(entity.x, entity.y)) {
        continue;
      }
      node.insert(entity);
    }
  }

  remove(entity: T) {
    if (!this.nodes) {
      this.entities = this.entities.filter((e) =>
        e.id ? e.id !== entity.id : entity === e
      );
    } else {
      for (const node of this.nodes) {
        if (node.bounds.contains(entity.x, entity.y)) {
          node.remove(entity);
          return;
        }
      }
    }
  }

  find(bounds: Bounds): T[] {
    if (!this.nodes) {
      return this.entities.filter((e) => bounds.contains(e.x, e.y));
    }
    return this.nodes
      .filter((node) => bounds.intersects(node.bounds))
      .reduce((prev, node) => prev.concat(node.find(bounds)), [] as T[]);
  }

  private subdivide() {
    const x = this.bounds.x;
    const y = this.bounds.y;
    const hw = this.bounds.width / 2;
    const hh = this.bounds.height / 2;
    this.nodes = [
      new Quadtree(rect(x + hw, y, hw, hh), this.maxN),
      new Quadtree(rect(x, y, hw, hh), this.maxN),
      new Quadtree(rect(x, y + hh, hw, hh), this.maxN),
      new Quadtree(rect(x + hw, y + hh, hw, hh), this.maxN),
    ];
    for (const p of this.entities) {
      this.insert(p);
    }
    this.entities = [];
  }
}
