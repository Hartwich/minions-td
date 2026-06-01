import type { ControllerLayoutKey } from "@open-party-lab/game-core";
import { minionsTdManifest } from "../manifest.js";
import { buildMinionsTdControllerModel } from "./MinionsTdController.js";

export const controllerGame = {
  id: minionsTdManifest.id,
  layoutKey: "tower_defense" as ControllerLayoutKey,
  buildLayout: buildMinionsTdControllerModel
} as const;

export { buildMinionsTdControllerModel };
