import type { SupportedLanguage } from "@open-party-lab/game-core";
import type {
  MinionsTdPlayerBoardState,
  MinionsTdState,
  MinionsTdTowerCatalogEntry
} from "../protocol.js";
import { resolveMinionsTdSellValue, resolveMinionsTdUpgradeCost } from "../protocol.js";
import {
  createMinionsTdBuildInput,
  createMinionsTdSellInput,
  createMinionsTdSendInput,
  createMinionsTdUpgradeInput,
  sortMinionsTdEnemiesByPressure
} from "./minionsTdBindings.js";

interface TowerDefenseTowerModel {
  id: string;
  slotId: string;
  towerTypeId: string;
  displayName: string;
  iconPath?: string;
  level: number;
  damage: number;
  range: number;
  fireRateMs: number;
  color: string;
  cooldownRemainingMs: number;
  investedGold: number;
  upgradeCost: number | null;
  sellValue: number;
  slowPct?: number;
  slowDurationMs?: number;
}

interface TowerDefenseSlotModel {
  id: string;
  col: number;
  row: number;
  tower: TowerDefenseTowerModel | null;
}

interface TowerDefensePlayerModel {
  playerId: string;
  name: string;
  color: string;
  gold: number;
  incomeTickValue: number;
  incomeTickEveryMs: number;
  lives: number;
  alive: boolean;
  kills: number;
  sends: number;
  leaks: number;
  leakSignalCount?: number;
  outgoingToPlayerId: string | null;
  outgoingToPlayerName: string | null;
}

interface TowerDefenseCatalogTowerModel {
  id: string;
  displayName: string;
  description: string;
  color: string;
  iconPath?: string;
  cost: number;
  sellRefundRatio: number;
  maxLevel: number;
  baseDamage: number;
  baseRange: number;
  baseFireRateMs: number;
  levels: Array<{
    level: number;
    price: number;
    damage: number;
    range: number;
    fireRateMs: number;
  }>;
}

interface TowerDefenseLayoutModel {
  kind: "tower_defense";
  title: string;
  subtitle?: string;
  helperText?: string;
  language?: SupportedLanguage;
  disabled: boolean;
  buildDisabled: boolean;
  sendDisabled: boolean;
  accentColor?: string;
  resetKey: string;
  currentPlayerId: string;
  currentPlayer: TowerDefensePlayerModel | null;
  nextTargetPlayer: TowerDefensePlayerModel | null;
  map: {
    id: string;
    name: string;
    cols: number;
    rows: number;
    pathCells: Array<{ col: number; row: number }>;
    buildSlots: TowerDefenseSlotModel[];
  };
  towerCatalog: TowerDefenseCatalogTowerModel[];
  enemyCatalog: Array<{
    id: string;
    displayName: string;
    description: string;
    color: string;
    iconPath?: string;
    sendCost: number;
    incomeBonus: number;
    maxHp: number;
    speed: number;
    bounty: number;
    damage: number;
  }>;
  players: TowerDefensePlayerModel[];
  onBuild: (slotId: string, towerTypeId: string) => void;
  onUpgrade: (slotId: string) => void;
  onSell: (slotId: string) => void;
  onSend: (enemyTypeId: string) => void;
}

interface ControllerGameRenderContext {
  state: {
    preferredLanguage?: SupportedLanguage;
    room?: {
      code?: string;
      language?: SupportedLanguage;
    } | null;
    player?: {
      id: string;
      color?: string;
    } | null;
    game?: {
      phase?: string;
      roundNumber?: number;
      state?: unknown;
    } | null;
  };
  onInput(input: unknown): void;
}

const towerDescriptionsEn: Record<string, string> = {
  "guard-cannon": "Affordable all-round tower with solid upgrades.",
  "emp-emitter": "Slows enemies and supports nearby towers.",
  "burst-cannon": "Deals area damage against groups.",
  "missile-silo": "Fires homing rockets with a large blast radius.",
  "tesla-coil": "Very high fire rate with strong single-target damage.",
  "ion-cannon": "Extremely expensive, but with enormous range and damage."
};

const enemyDescriptionsEn: Record<string, string> = {
  glint: "Weak starter minion with self-healing.",
  bulwark: "Early tank with EMP protection.",
  swiftstar: "Fast minion for early breakthroughs.",
  ironray: "Sturdy midgame minion with heavy armor.",
  verdantis: "Heals itself and survives scattered defenses well.",
  pulsefang: "Tough attacker that cannot be slowed.",
  rushclaw: "Fast and stable, ideal for pressure.",
  stonebeak: "Slow, highly durable income minion.",
  grimtalon: "Tough regeneration minion for longer paths.",
  shockfin: "Fast, sturdy, and resistant to EMP.",
  "viper-x": "Very fast and much tougher than expected.",
  colossar: "Massive armor breaker with enormous durability.",
  stormlord: "Heavy armor combined with healing.",
  ashdrake: "Fast endgame minion with EMP resistance.",
  flashreign: "Extremely fast nightmare for every defense.",
  hivecore: "Boss unit that spawns additional minions."
};

function formatPhaseLabel(phase: string | undefined, en: boolean): string {
  switch (phase) {
    case "round_intro":
      return "Intro";
    case "countdown":
      return "Countdown";
    case "playing":
      return en ? "Playing" : "Spielen";
    case "locked":
      return en ? "Locked" : "Gesperrt";
    case "result":
      return en ? "Result" : "Ergebnis";
    case "scoreboard":
      return "Scoreboard";
    case "finished":
      return en ? "Finished" : "Fertig";
    default:
      return en ? "Waiting" : "Warten";
  }
}

function toTowerCatalogEntry(entry: MinionsTdTowerCatalogEntry, en: boolean): TowerDefenseCatalogTowerModel {
  const baseLevel = entry.levels[0];

  return {
    id: entry.id,
    displayName: entry.displayName,
    description: en ? towerDescriptionsEn[entry.id] ?? entry.description : entry.description,
    color: entry.color,
    iconPath: entry.iconPath,
    cost: entry.cost,
    sellRefundRatio: entry.sellRefundRatio,
    maxLevel: entry.levels.length,
    baseDamage: baseLevel?.damage ?? 0,
    baseRange: baseLevel?.range ?? 0,
    baseFireRateMs: baseLevel?.fireRateMs ?? 0,
    levels: entry.levels.map((level) => ({
      level: level.level,
      price: level.price,
      damage: level.damage,
      range: level.range,
      fireRateMs: level.fireRateMs
    }))
  };
}

function estimateInvestedGold(
  baseCost: number,
  level: number,
  levels?: MinionsTdTowerCatalogEntry["levels"]
): number {
  let total = 0;

  for (let currentLevel = 1; currentLevel <= level; currentLevel += 1) {
    total +=
      currentLevel === 1
        ? baseCost
        : resolveMinionsTdUpgradeCost(baseCost, currentLevel - 1, levels);
  }

  return total;
}

function resolveTowerView(
  tower: MinionsTdPlayerBoardState["towers"][number],
  catalogs: MinionsTdTowerCatalogEntry[]
): TowerDefenseTowerModel {
  const catalog = catalogs.find((entry) => entry.id === tower.towerTypeId);
  const investedGold =
    tower.investedGold ??
    estimateInvestedGold(catalog?.cost ?? 0, tower.level, catalog?.levels);
  const upgradeCost = catalog && tower.level < catalog.levels.length
    ? resolveMinionsTdUpgradeCost(catalog.cost, tower.level, catalog.levels)
    : null;

  return {
    id: tower.id,
    slotId: tower.slotId,
    towerTypeId: tower.towerTypeId,
    displayName: tower.displayName,
    iconPath: catalog?.iconPath,
    level: tower.level,
    damage: tower.damage,
    range: tower.range,
    fireRateMs: tower.fireRateMs,
    color: tower.color,
    cooldownRemainingMs: tower.cooldownRemainingMs,
    investedGold,
    upgradeCost,
    sellValue: resolveMinionsTdSellValue(investedGold, catalog?.sellRefundRatio ?? 0.5),
    slowPct: tower.slowPct,
    slowDurationMs: tower.slowDurationMs
  };
}

function resolveSlots(
  state: MinionsTdState,
  currentPlayer: MinionsTdPlayerBoardState | null
): TowerDefenseSlotModel[] {
  const towersBySlotId = new Map(
    (currentPlayer?.towers ?? []).map((tower) => [tower.slotId, tower] as const)
  );

  return state.map.buildSlots.map((slot) => {
    const tower = towersBySlotId.get(slot.id);

    return {
      id: slot.id,
      col: slot.col,
      row: slot.row,
      tower: tower ? resolveTowerView(tower, state.towerCatalog) : null
    };
  });
}

function resolvePlayerView(player: MinionsTdPlayerBoardState): TowerDefensePlayerModel {
  return {
    playerId: player.playerId,
    name: player.name,
    color: player.color,
    gold: player.gold,
    incomeTickValue: player.incomeTickValue,
    incomeTickEveryMs: player.incomeTickEveryMs,
    lives: player.lives,
    alive: player.alive,
    kills: player.kills,
    sends: player.sends,
    leaks: player.leaks,
    leakSignalCount: player.leakSignalCount,
    outgoingToPlayerId: player.outgoingToPlayerId,
    outgoingToPlayerName: player.outgoingToPlayerName
  };
}

function resolveNextTargetPlayer(
  state: MinionsTdState,
  currentPlayer: MinionsTdPlayerBoardState
): MinionsTdPlayerBoardState | null {
  const explicitTarget = currentPlayer.outgoingToPlayerId
    ? state.players.find((player) => player.playerId === currentPlayer.outgoingToPlayerId) ?? null
    : null;

  if (explicitTarget) {
    return explicitTarget;
  }

  const currentIndex = state.ringOrder.indexOf(currentPlayer.playerId);

  if (currentIndex === -1 || state.ringOrder.length < 2) {
    return null;
  }

  const nextId = state.ringOrder[(currentIndex + 1) % state.ringOrder.length];
  return state.players.find((player) => player.playerId === nextId) ?? null;
}

const emptyMinionsTdState: MinionsTdState = {
  map: {
    id: "unknown",
    name: "Karte",
    cols: 0,
    rows: 0,
    pathCells: [],
    buildSlots: []
  },
  availableMaps: [],
  selectedMapId: "unknown",
  elapsedMs: 0,
  remainingMs: null,
  startingLives: 0,
  startingGold: 0,
  towerCatalog: [],
  enemyCatalog: [],
  players: [],
  ringOrder: [],
  alivePlayerIds: [],
  result: {
    outcome: "running"
  }
};

export function buildMinionsTdControllerModel(
  context: ControllerGameRenderContext
): TowerDefenseLayoutModel {
  const gameState = (context.state.game?.state ?? null) as MinionsTdState | null;
  const phase = context.state.game?.phase;
  const language = context.state.room?.language;
  const en = language === "en";
  const currentPlayerId = context.state.player?.id ?? "";
  const currentPlayer = gameState?.players.find((player) => player.playerId === currentPlayerId) ?? null;
  const currentPlayerView = currentPlayer ? resolvePlayerView(currentPlayer) : null;
  const nextTargetPlayer = gameState && currentPlayer ? resolveNextTargetPlayer(gameState, currentPlayer) : null;
  const towerCatalog = gameState?.towerCatalog ?? [];
  const enemyCatalog = gameState?.enemyCatalog ?? [];
  const disabled = !gameState || !currentPlayer;
  const buildDisabled = disabled || (phase !== "countdown" && phase !== "playing");
  const sendDisabled = disabled || phase !== "playing";

  return {
    kind: "tower_defense",
    language,
    title: "MinionsTD",
    subtitle: `${formatPhaseLabel(phase, en)} | ${context.state.room?.code ?? "----"}`,
    helperText:
      gameState?.result.outcome === "finished"
        ? en
          ? "Round finished. Keep building for the next wave or wait for the next start."
          : "Runde beendet. Baue weiter fuer die naechste Welle oder warte auf den naechsten Start."
        : currentPlayer
          ? en
            ? "Tap your map, choose a build slot, and manage towers plus sends from here."
            : "Tippe direkt auf deine Map, waehle einen Bauplatz und steuere Tower sowie Sends von hier."
          : en
            ? "Waiting for the round to start."
            : "Warte auf den Start der Runde.",
    disabled,
    buildDisabled,
    sendDisabled,
    accentColor: currentPlayer?.color ?? context.state.player?.color ?? "#38bdf8",
    resetKey: `${context.state.game?.roundNumber ?? 0}:${phase ?? "idle"}`,
    currentPlayerId,
    currentPlayer: currentPlayerView,
    nextTargetPlayer: nextTargetPlayer ? resolvePlayerView(nextTargetPlayer) : null,
    map: {
      id: gameState?.map.id ?? "unknown",
      name: gameState?.map.name ?? (en ? "Map" : "Karte"),
      cols: gameState?.map.cols ?? 0,
      rows: gameState?.map.rows ?? 0,
      pathCells: gameState?.map.pathCells ?? [],
      buildSlots: resolveSlots(gameState ?? emptyMinionsTdState, currentPlayer)
    },
    towerCatalog: towerCatalog.map((entry) => toTowerCatalogEntry(entry, en)),
    enemyCatalog: sortMinionsTdEnemiesByPressure(enemyCatalog).map((entry) => ({
      id: entry.id,
      displayName: entry.displayName,
      description: en ? enemyDescriptionsEn[entry.id] ?? entry.description : entry.description,
      color: entry.color,
      iconPath: entry.iconPath,
      sendCost: entry.sendCost,
      incomeBonus: entry.incomeBonus,
      maxHp: entry.maxHp,
      speed: entry.speed,
      bounty: entry.bounty,
      damage: entry.damage
    })),
    players: (gameState?.players ?? []).map(resolvePlayerView),
    onBuild(slotId, towerTypeId) {
      if (!currentPlayerId) {
        return;
      }

      context.onInput(createMinionsTdBuildInput(currentPlayerId, slotId, towerTypeId));
    },
    onUpgrade(slotId) {
      if (!currentPlayerId) {
        return;
      }

      context.onInput(createMinionsTdUpgradeInput(currentPlayerId, slotId));
    },
    onSell(slotId) {
      if (!currentPlayerId) {
        return;
      }

      context.onInput(createMinionsTdSellInput(currentPlayerId, slotId));
    },
    onSend(enemyTypeId) {
      if (!currentPlayerId) {
        return;
      }

      context.onInput(createMinionsTdSendInput(currentPlayerId, enemyTypeId));
    }
  };
}
