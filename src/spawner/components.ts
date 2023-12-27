import * as PIXI from "pixi.js";
import * as ECS from "../ecs";
import { Vec2 } from "../geometry";

export class Named extends ECS.Component<string> {}

export class Position extends ECS.Component<{
  x: number;
  y: number;
}> {}

export class Velocity extends ECS.Component<Vec2> {}

export class Graphics extends ECS.Component<PIXI.Graphics> {
  constructor(state: PIXI.Graphics, readonly stage: PIXI.Container) {
    super(state);
  }
  init = () => this.stage.addChild(this.state);
  done = () => this.state.removeFromParent();
}
