import Phaser from "phaser";
import type { SupportedLanguage } from "@open-party-lab/game-core";
import type { MinionsTdState } from "../protocol.js";
import {
  buildMinionsTdPanelHeader,
  createMinionsTdStaticLayer,
  createMinionsTdSpriteLayer,
  destroyMinionsTdStaticLayer,
  destroyMinionsTdSpriteLayer,
  drawMinionsTdDynamicState,
  drawMinionsTdEnemyHealthBars,
  emptyMinionsTdStaticLayerMetrics,
  type MinionsTdPanelLayout,
  type MinionsTdStaticLayer,
  type MinionsTdStaticLayerMetrics,
  hideMinionsTdStaticLayer,
  hideMinionsTdSpriteLayer,
  resolveMinionsTdPanelLayout,
  syncMinionsTdStaticLayer,
  syncMinionsTdSpriteLayer
} from "./MinionsTdRenderer.js";
import { loadMinionsTdAssets } from "./minionsTdAssets.js";

const minionsTdTextRefreshMs = 200;
const minionsTdRenderIntervalMs = 1000 / 30;
const hostTheme = {
  titleFont: '"Oxanium", "Arial", sans-serif',
  bodyFont: '"Nunito Sans", "Arial", sans-serif',
  text: "#f8fafc",
  muted: "#94a3b8"
};

interface HostClientLike {
  getState(): {
    preferredLanguage?: SupportedLanguage;
  };
  subscribe(callback: (state: HostAppStateLike) => void): () => void;
}

interface HostAppStateLike {
  game?: {
    gameId?: string;
    roundNumber?: number;
    phase?: string;
    updatedAt?: number;
    state?: unknown;
  } | null;
  room?: {
    code?: string;
    lifecycle?: string;
    currentRound?: {
      roundNumber?: number;
    } | null;
    language?: SupportedLanguage;
  } | null;
}

interface PendingMinionsTdRender {
  renderStamp: string;
  state: MinionsTdState | null;
  roomCode: string;
  phase?: string;
  language?: SupportedLanguage;
}

export class MinionsTdHostScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private staticLayer?: MinionsTdStaticLayer;
  private dynamicGraphics?: Phaser.GameObjects.Graphics;
  private enemyHudGraphics?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private subtitleText?: Phaser.GameObjects.Text;
  private panelHeaderTexts: Phaser.GameObjects.Text[] = [];
  private spriteLayer = createMinionsTdSpriteLayer();
  private lastStaticKey: string | null = null;
  private lastLayout: MinionsTdPanelLayout | null = null;
  private lastRenderStamp: string | null = null;
  private pendingRender?: PendingMinionsTdRender;
  private lastFrameRenderAtMs = Number.NEGATIVE_INFINITY;
  private lastStaticMetrics: MinionsTdStaticLayerMetrics = emptyMinionsTdStaticLayerMetrics;
  private lastTextRefreshAtMs = 0;
  private staticRedrawCount = 0;

  constructor() {
    super("MinionsTdHostScene");
  }

  preload(): void {
    loadMinionsTdAssets(this);
  }

  create(): void {
    const client = this.registry.get("hostClient") as HostClientLike;

    this.cameras.main.setBackgroundColor("#020617");
    this.staticLayer = createMinionsTdStaticLayer(this);
    this.dynamicGraphics = this.add.graphics();
    this.dynamicGraphics.setDepth(2);
    this.enemyHudGraphics = this.add.graphics();
    this.enemyHudGraphics.setDepth(6);
    this.titleText = this.add.text(12, 10, "MinionsTD", {
      fontFamily: hostTheme.titleFont,
      fontSize: "28px",
      color: hostTheme.text
    });
    this.titleText.setDepth(10);
    this.subtitleText = this.add.text(
      12,
      36,
      client.getState().preferredLanguage === "en" ? "Waiting for an active round" : "Warte auf eine laufende Runde",
      {
      fontFamily: hostTheme.bodyFont,
      fontSize: "15px",
      color: hostTheme.muted
      }
    );
    this.subtitleText.setDepth(10);

    this.panelHeaderTexts = Array.from({ length: 4 }, () =>
      this.add.text(0, 0, "", {
        fontFamily: hostTheme.titleFont,
        fontSize: "16px",
        color: hostTheme.text,
        align: "left"
      }).setDepth(10)
    );
    this.unsubscribe = client.subscribe((state) => {
      const renderStamp = [
        state.room?.code ?? "----",
        state.room?.lifecycle ?? "unknown",
        state.room?.currentRound?.roundNumber ?? 0,
        state.game?.gameId ?? "none",
        state.game?.roundNumber ?? 0,
        state.game?.phase ?? "none",
        state.game?.updatedAt ?? "none"
      ].join("|");

      if (renderStamp === this.lastRenderStamp || renderStamp === this.pendingRender?.renderStamp) {
        return;
      }

      this.pendingRender = {
        renderStamp,
        state: state.game?.state ? (state.game.state as MinionsTdState) : null,
        roomCode: state.room?.code ?? "----",
        phase: state.game?.phase,
        language: state.room?.language
      };
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      if (this.staticLayer) {
        destroyMinionsTdStaticLayer(this.staticLayer);
        this.staticLayer = undefined;
      }
      this.dynamicGraphics?.destroy();
      this.dynamicGraphics = undefined;
      this.enemyHudGraphics?.destroy();
      this.enemyHudGraphics = undefined;
      this.titleText?.destroy();
      this.titleText = undefined;
      this.subtitleText?.destroy();
      this.subtitleText = undefined;
      for (const text of this.panelHeaderTexts) {
        text.destroy();
      }
      this.panelHeaderTexts = [];
      destroyMinionsTdSpriteLayer(this.spriteLayer);
      this.lastStaticKey = null;
      this.lastLayout = null;
      this.lastRenderStamp = null;
      this.pendingRender = undefined;
      this.lastFrameRenderAtMs = Number.NEGATIVE_INFINITY;
      this.lastStaticMetrics = emptyMinionsTdStaticLayerMetrics;
      this.lastTextRefreshAtMs = 0;
      this.staticRedrawCount = 0;
    });
  }

  update(time: number): void {
    if (!this.pendingRender || time - this.lastFrameRenderAtMs < minionsTdRenderIntervalMs) {
      return;
    }

    const pendingRender = this.pendingRender;
    this.pendingRender = undefined;
    this.lastRenderStamp = pendingRender.renderStamp;
    this.lastFrameRenderAtMs = time;
    this.renderState(
      pendingRender.state,
      pendingRender.roomCode,
      pendingRender.phase,
      pendingRender.language
    );
  }

  private setTextIfChanged(target: Phaser.GameObjects.Text, value: string): void {
    if (target.text !== value) {
      target.setText(value);
    }
  }

  private setPositionIfChanged(target: Phaser.GameObjects.Text, x: number, y: number): void {
    if (target.x !== x || target.y !== y) {
      target.setPosition(x, y);
    }
  }

  private buildStaticKey(state: MinionsTdState): string {
    return [
      this.scale.width,
      this.scale.height,
      state.map.id,
      ...state.players.slice(0, 4).map((player) =>
        player ? `${player.playerId}:${player.color}:${player.alive ? 1 : 0}` : "empty"
      )
    ].join("|");
  }

  private syncPanelTextLayout(layout: MinionsTdPanelLayout, state: MinionsTdState): void {
    for (let index = 0; index < 4; index += 1) {
      const player = state.players[index] ?? null;
      const panelRect = layout.panelRects[index];
      const header = this.panelHeaderTexts[index];

      if (!panelRect) {
        header.setVisible(false);
        continue;
      }

      header.setVisible(true);
      const quadrant = layout.rotationQuarterTurns[index] ?? 0;
      const headerY = quadrant >= 2 ? panelRect.y + panelRect.height - 25 : panelRect.y + 5;
      this.setPositionIfChanged(header, panelRect.x + 8, headerY);
      header.setColor(player?.alive ? player.color : hostTheme.text);
    }
  }

  private refreshTexts(state: MinionsTdState, roomCode: string, phase: string | undefined, language?: SupportedLanguage): void {
    const en = language === "en";
    this.setTextIfChanged(this.titleText!, "MinionsTD");
    this.setTextIfChanged(
      this.subtitleText!,
      `${en ? "Room" : "Raum"} ${roomCode}`
    );
    void phase;

    for (let index = 0; index < 4; index += 1) {
      const player = state.players[index] ?? null;
      const header = this.panelHeaderTexts[index];

      this.setTextIfChanged(header, buildMinionsTdPanelHeader(player, index, language));
    }
  }

  private renderState(state: MinionsTdState | null, roomCode: string, phase?: string, language?: SupportedLanguage): void {
    if (!this.staticLayer || !this.dynamicGraphics || !this.enemyHudGraphics || !this.titleText || !this.subtitleText) {
      return;
    }

    if (!state) {
      hideMinionsTdStaticLayer(this.staticLayer);
      this.dynamicGraphics.clear();
      this.enemyHudGraphics.clear();
      hideMinionsTdSpriteLayer(this.spriteLayer);
      this.lastStaticKey = null;
      this.lastLayout = null;
      this.lastStaticMetrics = emptyMinionsTdStaticLayerMetrics;
      this.lastTextRefreshAtMs = 0;
      this.staticRedrawCount = 0;
      this.setTextIfChanged(this.titleText, "MinionsTD");
      const en = language === "en";
      this.setTextIfChanged(
        this.subtitleText,
        `${en ? "Room" : "Raum"} ${roomCode} | Phase ${phase ?? "unknown"} | ${en ? "Waiting for game data" : "Warte auf Spieldaten"}`
      );
      for (const text of this.panelHeaderTexts) {
        this.setTextIfChanged(text, "");
      }
      return;
    }

    const frameStart = performance.now();
    const staticKey = this.buildStaticKey(state);
    let staticMs = 0;
    let staticVectorMs = 0;
    let staticStampMs = 0;
    let layoutMs = 0;
    let staticRedraw = false;
    let staticMetrics = this.lastStaticMetrics;
    let layout = this.lastLayout;

    if (!layout || staticKey !== this.lastStaticKey) {
      const staticStart = performance.now();
      const staticResult = syncMinionsTdStaticLayer(this, this.staticLayer, state);
      staticMs = performance.now() - staticStart;
      staticVectorMs = staticResult.metrics.vectorRasterMs;
      staticStampMs = staticResult.metrics.tileStampMs;
      layoutMs = staticResult.metrics.layoutMs;
      staticMetrics = staticResult.metrics;
      staticRedraw = true;
      layout = staticResult.layout;
      this.lastStaticKey = staticKey;
      this.lastLayout = layout;
      this.lastStaticMetrics = staticMetrics;
      this.staticRedrawCount += 1;
      this.syncPanelTextLayout(layout, state);
    }

    layout ??= resolveMinionsTdPanelLayout(this, state);

    const dynamicStart = performance.now();
    drawMinionsTdDynamicState(this.dynamicGraphics, this, state, layout);
    drawMinionsTdEnemyHealthBars(this.enemyHudGraphics, state, layout);
    const dynamicMs = performance.now() - dynamicStart;

    const spriteStart = performance.now();
    syncMinionsTdSpriteLayer(this, this.spriteLayer, state, layout);
    const spriteMs = performance.now() - spriteStart;

    const textStart = performance.now();
    if (staticRedraw || frameStart - this.lastTextRefreshAtMs >= minionsTdTextRefreshMs) {
      this.refreshTexts(state, roomCode, phase, language);
      this.lastTextRefreshAtMs = frameStart;
    }
    const textMs = performance.now() - textStart;
    const totalMs = performance.now() - frameStart;

    void totalMs;
    void layoutMs;
    void staticMs;
    void staticVectorMs;
    void staticStampMs;
    void dynamicMs;
    void spriteMs;
    void textMs;
    void staticMetrics;
    void staticRedraw;
  }
}
