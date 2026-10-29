import assert from "node:assert/strict";
import { test } from "node:test";
import { minionsTdTowerCatalog, minionsTdEnemyCatalog } from "../dist/server/minionsTdConfig.js";
import { localizeMinionsTdContent } from "../dist/contentText.js";
import { toPublicMinionsTdState, toControllerMinionsTdState } from "../dist/server/minionsTdState.js";

test("every tower and minion description and trait has an English translation", () => {
  for (const entry of [...minionsTdTowerCatalog, ...minionsTdEnemyCatalog]) {
    const translated = localizeMinionsTdContent(entry, "en");
    assert.notEqual(translated.description, entry.description, entry.id);
    assert.equal(translated.id, entry.id);
    for (const [index, level] of (entry.levels ?? []).entries()) {
      assert.notEqual(translated.levels[index].targeting, level.targeting, entry.id);
      assert.notEqual(translated.levels[index].trait, level.trait, entry.id);
      assert.equal(translated.levels[index].damage, level.damage);
      assert.equal(translated.levels[index].price, level.price);
    }
    if (entry.trait) assert.notEqual(translated.trait, entry.trait, entry.id);
  }
});

test("German tower names and roles are localized without changing targeting mechanics or source data", () => {
  const before = structuredClone(minionsTdTowerCatalog);
  const german = localizeMinionsTdContent(minionsTdTowerCatalog, "de");
  assert.equal(german[0].displayName, "Wachkanone");
  assert.equal(german[0].role, "Basis");
  assert.equal(german[0].levels[0].targeting, minionsTdTowerCatalog[0].levels[0].targeting);
  assert.deepEqual(minionsTdTowerCatalog, before);
});

test("host and private controller serializers both use localized tower presentation", () => {
  const player = { playerId: "p1", name: "Guard Cannon", towers: [{ id: "t1", displayName: "Guard Cannon", towerTypeId: "guard", targeting: "Naechste", trait: "Keine", totalInvested: 50 }], enemies: [], projectiles: [] };
  const state = { language: "de", availableMaps: [], players: [player], ringOrder: ["p1"], alivePlayerIds: ["p1"], result: {} };
  for (const view of [toPublicMinionsTdState(state), toControllerMinionsTdState(state, "p1")]) {
    assert.equal(view.players[0].name, "Guard Cannon");
    assert.equal(view.players[0].towers[0].displayName, "Wachkanone");
    assert.equal(view.players[0].towers[0].towerTypeId, "guard");
    assert.equal(view.players[0].towers[0].totalInvested, undefined);
  }
  state.language = "en";
  assert.equal(toPublicMinionsTdState(state).players[0].towers[0].targeting, "Nearest");
  assert.equal(player.towers[0].targeting, "Naechste");
});
