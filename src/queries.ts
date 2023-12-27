import * as ECS from "./ecs";
import * as components from "./components";

export const Spatial = new ECS.Query([
  components.Position,
  components.Graphics,
]);
