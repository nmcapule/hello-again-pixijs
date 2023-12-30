import * as PIXI from "pixi.js";
import * as ECS from "../ecs";
import * as components from "./components";

export function setupInitialEntities<T extends components.Color<unknown>>(
  container: PIXI.Container,
  bounds: PIXI.Rectangle,
  colorConstructor: () => T,
  n = 200
) {
  return (commands: ECS.Commands) => {
    for (let i = 0; i < n; i++) {
      const graphics = new PIXI.Graphics();
      const color = colorConstructor();
      graphics.beginFill(color.state as string);
      graphics.drawCircle(0, 0, 2);

      const position = new components.Position({
        x: Math.random() * bounds.width,
        y: Math.random() * bounds.height,
      });

      commands.spawn(
        position,
        color,
        new components.Velocity({ vx: 0, vy: 0 }),
        new components.Graphics(graphics, container)
      );
    }
  };
}

export * from "./components";
export * from "./systems";
