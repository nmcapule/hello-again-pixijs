import * as ECS from "../ecs";
import * as PIXI from "pixi.js";

export class Graphics extends ECS.Component<PIXI.Graphics> {
  constructor(state: PIXI.Graphics, readonly stage: PIXI.Container) {
    super(state);
  }
  init = () => this.stage.addChild(this.state);
  done = () => this.state.removeFromParent();
}

export class Position extends ECS.Component<{
  x: number;
  y: number;
}> {
  get x() {
    return this.state.x;
  }
  get y() {
    return this.state.y;
  }
}

export class Velocity extends ECS.Component<{
  vx: number;
  vy: number;
}> {}

export class Color<T = string> extends ECS.Component<T> {}
