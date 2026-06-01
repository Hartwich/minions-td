import { minionsTdManifest } from "../manifest.js";
import { MinionsTdHostScene } from "./MinionsTdHostScene.js";

export const hostGame = {
  id: minionsTdManifest.id,
  displayName: minionsTdManifest.displayName,
  sceneKey: minionsTdManifest.hostView,
  scene: MinionsTdHostScene
} as const;

export { MinionsTdHostScene };
