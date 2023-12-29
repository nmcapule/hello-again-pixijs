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
}> {}

export class Velocity extends ECS.Component<{
  vx: number;
  vy: number;
}> {}

export class Color<T> extends ECS.Component<T> {}

export class RedColor extends Color<"red"> {
  constructor() {
    super("red");
  }
}
export class GreenColor extends Color<"blue"> {
  constructor() {
    super("blue");
  }
}
export class YellowColor extends Color<"yellow"> {
  constructor() {
    super("yellow");
  }
}
