import * as ECS from "../ecs";
import * as PIXI from "pixi.js";
import * as components from "./components";

export function setupInitialEntities(stage: PIXI.Container, n = 100) {
  function createPlaceholderGraphics(color: number) {
    const playerGraphics = new PIXI.Graphics();
    playerGraphics.beginFill(color);
    playerGraphics.drawCircle(0, 0, 2);
    return playerGraphics;
  }
  return (world: ECS.World) => {
    for (let i = 0; i < n; i++) {
      const graphics = createPlaceholderGraphics(Math.random() * 0xffffff);
      world.spawn(
        new components.Position({
          x: Math.random() * 800,
          y: Math.random() * 640,
        }),
        new components.Graphics(graphics, stage),
        new components.Named(`instance#${i}`)
      );
    }
  };
}

export * from "./components";
export * from "./systems";
