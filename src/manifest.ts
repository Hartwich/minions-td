import type { GameManifest } from "@open-party-lab/game-core";
import { minionsTdSetupConfig } from "./protocol.js";
import {
  listMinionsTdMaps,
  minionsTdRoomSettingKeys,
  resolveMinionsTdMap
} from "./server/minionsTdConfig.js";

export const minionsTdManifest = {
  id: "minions-td",
  displayName: "MinionsTD",
  description: "Baue Tower, schicke Minions weiter und halte deine Lane laenger als die anderen.",
  minPlayers: 2,
  maxPlayers: 4,
  hostView: "MinionsTdHostScene",
  controllerView: "minions-td",
  controllerLayout: "tower_defense",
  supportsTeams: false,
  estimatedRoundDurationMs: 180_000,
  lobbySetup: {
    title: "MinionsTD Setup",
    description: "Waehle Map, Startleben und Startgold vor dem Rundenstart.",
    fields: [
      {
        kind: "select",
        id: "mapId",
        settingKey: minionsTdRoomSettingKeys.selectedMapId,
        actionKey: "mapId",
        label: "Map",
        defaultValue: resolveMinionsTdMap(null, 1).id,
        options: listMinionsTdMaps().map((map) => ({
          id: map.id,
          label: map.name
        }))
      },
      {
        kind: "number",
        id: "startingLives",
        settingKey: minionsTdRoomSettingKeys.startingLives,
        actionKey: "startingLives",
        label: "Startleben",
        min: minionsTdSetupConfig.startingLives.min,
        max: minionsTdSetupConfig.startingLives.max,
        step: minionsTdSetupConfig.startingLives.step,
        defaultValue: minionsTdSetupConfig.startingLives.defaultValue
      },
      {
        kind: "number",
        id: "startingGold",
        settingKey: minionsTdRoomSettingKeys.startingGold,
        actionKey: "startingGold",
        label: "Startgold",
        min: minionsTdSetupConfig.startingGold.min,
        max: minionsTdSetupConfig.startingGold.max,
        step: minionsTdSetupConfig.startingGold.step,
        defaultValue: minionsTdSetupConfig.startingGold.defaultValue
      }
    ]
  },
  phaseDurations: {
    roundIntroMs: 1_800,
    countdownMs: 2_200,
    resultMs: 4_500,
    scoreboardMs: 4_500
  },

  ownsScreens: ["round_intro", "result"],
  visual: { accent: "#6e8b74", eyebrow: "Tower Defense" },
  audio: { track: { profile: "strategy", bpm: 96, rootMidi: 43, masterGain: 0.16 } },
} as const satisfies GameManifest;

export const manifest = minionsTdManifest;
