/** Presentation-only localization. Catalog identifiers and combat values stay unchanged. */
const english: Readonly<Record<string, string>> = {
  "Guenstiger Allround-Turm mit soliden Upgrades.": "An affordable all-round tower with dependable upgrades.",
  "Verlangsamt Gegner und stuetzt andere Tuerme.": "Slows enemies and supports other towers.",
  "Verursacht Flaechenschaden gegen Gruppen.": "Deals area damage against groups.",
  "Feuert zielsuchende Raketen mit grossem Explosionsradius.": "Fires homing missiles with a large blast radius.",
  "Sehr hohe Feuerrate mit starkem Einzelschaden.": "A very high firing rate with strong single-target damage.",
  "Extrem teuer, aber mit enormer Reichweite und Schaden.": "Extremely expensive, but with enormous range and damage.",
  "Schwacher Start-Minion mit Selbstheilung.": "A weak starting minion with self-healing.",
  "Frueher Tank mit EMP-Schutz.": "An early tank with EMP protection.",
  "Flinker Minion fuer fruehe Durchbrueche.": "A nimble minion for early breakthroughs.",
  "Robuster Midgame-Minion mit viel Panzerung.": "A sturdy mid-game minion with heavy armor.",
  "Heilt sich und haelt verstreute Verteidigung gut aus.": "Heals itself and withstands scattered defenses.",
  "Zaeher Angreifer, der nicht verlangsamt wird.": "A tough attacker that cannot be slowed.",
  "Schnell und stabil, ideal fuer Druck.": "Fast and sturdy, ideal for applying pressure.",
  "Langsamer, sehr widerstandsfaehiger Einkommens-Minion.": "A slow, very durable income minion.",
  "Zaeher Regenerations-Minion fuer laengere Wege.": "A tough regenerating minion for longer paths.",
  "Schnell, robust und resistent gegen EMP.": "Fast, sturdy and resistant to EMP.",
  "Sehr schnell und deutlich haerter als erwartet.": "Very fast and much tougher than expected.",
  "Massiver Panzerbrecher mit enormer Haltbarkeit.": "A massive armor-breaker with enormous durability.",
  "Schwere Panzerung kombiniert mit Heilung.": "Heavy armor combined with healing.",
  "Schneller Endgame-Minion mit EMP-Resistenz.": "A fast late-game minion with EMP resistance.",
  "Extrem schneller Albtraum fuer jede Verteidigung.": "An extremely fast nightmare for any defense.",
  "Boss-Einheit, die weitere Minions hervorbringt.": "A boss unit that spawns additional minions.",
  "Naechste": "Nearest",
  "Schnellste": "Fastest",
  "Staerkste": "Strongest",
  "Guenstige Verbesserung": "Affordable upgrade",
  "Keine": "None",
  "Verlangsamt Ziel": "Slows its target",
  "Verlangsamt mehrere Ziele": "Slows multiple targets",
  "Verursacht Flaechenschaden": "Deals area damage",
  "Startet zielsuchende Raketen": "Launches homing missiles",
  "Schnelle Angriffsgeschwindigkeit": "Fast attacks",
  "Sehr schnelle Angriffsgeschwindigkeit": "Very fast attacks",
  "Super schnelle Angriffsgeschwindigkeit": "Extremely fast attacks",
  "Ultra schnelle Angriffsgeschwindigkeit": "Ultra-fast attacks",
  "Hoher Schaden, sehr hohe Reichweite": "High damage, very long range",
  "Maximaler Schaden und Reichweite": "Maximum damage and range",
  "Regeneriert": "Regenerates",
  "EMP-immun": "EMP-immune",
  "Schnell": "Fast",
  "Stark": "Strong",
  "Sehr schnell": "Very fast",
  "Generiert Minions": "Spawns minions"
};
const german: Readonly<Record<string, string>> = {
  "Guard Cannon": "Wachkanone",
  "EMP Emitter": "EMP-Sender",
  "Burst Cannon": "Sprengkanone",
  "Missile Silo": "Raketensilo",
  "Tesla Coil": "Teslaspule",
  "Ion Cannon": "Ionenkanone",
  "Basic": "Basis",
  "Slow": "Verlangsamung",
  "Splash": "Flächenschaden",
  "Rocket": "Raketen",
  "Speed": "Tempo",
  "Ultimate": "Ultimativ"
};
const fields = new Set(["displayName", "description", "role", "targeting", "trait"]);
export function localizeMinionsTdContent<T>(value: T, language?: "de" | "en"): T {
  const text = language === "en" ? english : german;
  if (Array.isArray(value)) return value.map(entry => localizeMinionsTdContent(entry, language)) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key,
    typeof entry === "string" && fields.has(key) ? text[entry] ?? entry
      : entry && typeof entry === "object" ? localizeMinionsTdContent(entry, language) : entry
  ])) as T;
}
