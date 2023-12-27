import * as PIXI from "pixi.js";
import * as ECS from "./ecs";

export class Position extends ECS.Component<{
  x: number;
  y: number;
}> {}

export class Graphics extends ECS.Component<PIXI.Graphics> {}
