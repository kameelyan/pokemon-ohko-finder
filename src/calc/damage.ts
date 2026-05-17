import type { GameData, Move, Pokemon } from '../data/types';

/**
 * Moves that cannot be used while Gravity is in effect.
 * (Fly, Jump Kick, High Jump Kick, Bounce, Sky Drop)
 */
const GRAVITY_UNUSABLE_MOVE_IDS = new Set([19, 26, 136, 340, 507]);

/**
 * Sheer Force moves whose secondary effect is always guaranteed (100%), so PokeAPI
 * stores no `effect_chance` value — they must be explicitly included.
 * Spirit Shackle (662), Anchor Shot (677), Genesis Supernova (703).
 */
const SHEER_FORCE_ALWAYS_MOVE_IDS = new Set([662, 677, 703]);

/**
 * PokeAPI effect IDs whose `effect_chance` represents a self-debuff (user stat drop)
 * rather than a beneficial secondary effect. Sheer Force must NOT boost these moves
 * even though they have effect_chance > 0.
 *
 *  183 — lowers user's Atk and Def (Superpower)
 *  205 — lowers user's Sp. Atk by 2 (Overheat, Draco Meteor, Leaf Storm, Fleur Cannon, Psycho Boost)
 *  219 — lowers user's Speed (Hammer Arm, Ice Hammer)
 *  230 — lowers user's Def and Sp. Def (Close Combat, Dragon Ascent)
 */
const SHEER_FORCE_EXCLUDED_EFFECT_IDS = new Set([183, 205, 219, 230]);

/**
 * Foul Play uses the *target's* Attack stat instead of the attacker's.
 */
export const FOUL_PLAY_MOVE_ID = 492;

/**
 * Body Press deals damage using the attacker's Defense stat instead of Attack.
 */
export const BODY_PRESS_MOVE_ID = 776;
export const ROUND_MOVE_ID = 496;
/**
 * Electro Shot charges on turn one (raising SpA by +1) and fires on turn two.
 * In Rain both happen simultaneously — it's a one-turn move, but the +1 SpA
 * boost still applies. Exported so the loader can set move.twoTurn correctly.
 */
export const ELECTRO_SHOT_MOVE_ID = 905;

/**
 * Psyshock, Psystrike, and Secret Sword are Special moves that deal damage
 * using the *target's* Defense stat instead of its Sp. Defense.
 */
export const PSYSHOCK_MOVE_IDS = new Set([473, 540, 548]);

/**
 * Effect IDs for moves that deal double damage when the user moves after the
 * target (or takes a hit first this turn).
 *
 *  186 — Avalanche / Revenge: doubles power if the user was hit before acting.
 *        Both have −4 priority so they virtually always go last.
 *  231 — Payback: doubles power if the target has already moved this turn.
 *
 * For calc purposes we always assume the doubled power — the player would only
 * run these moves in conditions where the double applies.
 */
const GOING_SECOND_EFFECT_IDS = new Set([186, 231]);

export interface EVSpread {
  hp: number;
  atk: number;
  def: number;
  /** Sp. Atk investment — used only for total-SP validation in Champions SP mode; does not affect defensive calcs. */
  spa: number;
  spd: number;
  spe: number;
}

export interface TargetConfig {
  pokemon: Pokemon;
  evs: EVSpread;
  heldItem?: TargetHeldItem;
  reflect?: boolean;
  lightScreen?: boolean;
  atkNature?: number;  // 0.9 | 1.0 | 1.1
  defNature?: number;
  spdNature?: number;
  speNature?: number;
  /** Partner Pokémon has Friend Guard — reduces all incoming damage by ×0.75 (doubles only). */
  friendGuard?: boolean;
  /** Active Attack stat stage for this target (−6 to +6) — used by Foul Play. */
  atkStage?: number;
  /** Active Defense stat stage for this target (−6 to +6). */
  defStage?: number;
  /** Active Sp. Defense stat stage for this target (−6 to +6). */
  spdStage?: number;
  /** The ability the target is using — applied as a defensive modifier in damage calculations. */
  selectedAbilityIdentifier?: string;
}

export interface TargetHeldItem {
  name: string;
  identifier: string;
  defMult: number;
  spdMult: number;
  speedMult: number; // multiplier on the target's Speed stat (for outspeed comparisons)
  accuracyMult: number;
  typeResists: { typeId: number; mult: number }[];
  /**
   * True for Focus Sash. Prevents an OHKO from full HP by a single hit, leaving the target
   * at 1 HP. Unlike Sturdy, this is an item so Mold Breaker does NOT bypass it.
   * Multi-hit moves (min ≥ 2 hits) and Parental Bond still break it.
   */
  focusSash?: boolean;
}

/** Defensive held items available on target Pokémon. */
export const TARGET_HELD_ITEMS: TargetHeldItem[] = [
  { name: 'Choice Scarf',  identifier: 'choice-scarf',  defMult: 1.0, spdMult: 1.0, speedMult: 1.5, accuracyMult: 1.0, typeResists: [] },
  { name: 'Eviolite',      identifier: 'eviolite',      defMult: 1.5, spdMult: 1.5, speedMult: 1.0, accuracyMult: 1.0, typeResists: [] },
  { name: 'Assault Vest',  identifier: 'assault-vest',  defMult: 1.0, spdMult: 1.5, speedMult: 1.0, accuracyMult: 1.0, typeResists: [] },
  { name: 'Bright Powder', identifier: 'brightpowder',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 0.9, typeResists: [] },
  { name: 'Lax Incense',   identifier: 'lax-incense',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 0.9, typeResists: [] },
  { name: 'Chilan Berry',  identifier: 'chilan-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 1,  mult: 0.5 }] },
  { name: 'Chople Berry',  identifier: 'chople-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 2,  mult: 0.5 }] },
  { name: 'Coba Berry',    identifier: 'coba-berry',    defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 3,  mult: 0.5 }] },
  { name: 'Kebia Berry',   identifier: 'kebia-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 4,  mult: 0.5 }] },
  { name: 'Shuca Berry',   identifier: 'shuca-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 5,  mult: 0.5 }] },
  { name: 'Charti Berry',  identifier: 'charti-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 6,  mult: 0.5 }] },
  { name: 'Tanga Berry',   identifier: 'tanga-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 7,  mult: 0.5 }] },
  { name: 'Kasib Berry',   identifier: 'kasib-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 8,  mult: 0.5 }] },
  { name: 'Babiri Berry',  identifier: 'babiri-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 9,  mult: 0.5 }] },
  { name: 'Occa Berry',    identifier: 'occa-berry',    defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 10, mult: 0.5 }] },
  { name: 'Passho Berry',  identifier: 'passho-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 11, mult: 0.5 }] },
  { name: 'Rindo Berry',   identifier: 'rindo-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 12, mult: 0.5 }] },
  { name: 'Wacan Berry',   identifier: 'wacan-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 13, mult: 0.5 }] },
  { name: 'Payapa Berry',  identifier: 'payapa-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 14, mult: 0.5 }] },
  { name: 'Yache Berry',   identifier: 'yache-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 15, mult: 0.5 }] },
  { name: 'Haban Berry',   identifier: 'haban-berry',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 16, mult: 0.5 }] },
  { name: 'Colbur Berry',  identifier: 'colbur-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 17, mult: 0.5 }] },
  { name: 'Roseli Berry',  identifier: 'roseli-berry',  defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 18, mult: 0.5 }] },
  { name: 'Focus Sash',   identifier: 'focus-sash',   defMult: 1.0, spdMult: 1.0, speedMult: 1.0, accuracyMult: 1.0, typeResists: [], focusSash: true },
];

export interface HeldItem {
  name: string;
  identifier: string;
  boost: number;
}

/** Active weather condition. Affects damage for certain move types and some abilities. */
export type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'snow';

/** Active terrain. Affects damage for certain move types. */
export type Terrain = 'none' | 'electric' | 'grassy' | 'misty' | 'psychic';

export const TERRAIN_INFO: Record<Exclude<Terrain, 'none'>, {
  label: string;
  icon: string;
  bg: string;
  color: string;
  description: string;
}> = {
  electric: { label: 'Electric Terrain', icon: '⚡', bg: '#fefce8', color: '#a16207', description: 'Boosts Electric-type moves ×1.3 for grounded Pokémon.' },
  grassy:   { label: 'Grassy Terrain',   icon: '🌿', bg: '#f0fff4', color: '#276749', description: 'Boosts Grass-type moves ×1.3. Weakens Earthquake, Magnitude & Bulldoze ×0.5.' },
  misty:    { label: 'Misty Terrain',    icon: '🌫️', bg: '#fdf2f8', color: '#9d174d', description: 'Halves the power of Dragon-type moves against grounded Pokémon.' },
  psychic:  { label: 'Psychic Terrain',  icon: '🔮', bg: '#faf5ff', color: '#6b21a8', description: 'Boosts Psychic-type moves ×1.3 for grounded Pokémon.' },
};

/** Move IDs weakened ×0.5 under Grassy Terrain (Earthquake, Magnitude, Bulldoze). */
const GRASSY_WEAKENED_MOVE_IDS = new Set([89, 222, 523]);

export function getTerrainMult(terrain: Terrain, moveId: number, effectiveTypeId: number): number {
  switch (terrain) {
    case 'electric': return effectiveTypeId === 13 ? 1.3 : 1.0;
    case 'grassy':
      if (effectiveTypeId === 12) return 1.3;           // Grass moves boosted
      if (GRASSY_WEAKENED_MOVE_IDS.has(moveId)) return 0.5; // Ground spread moves weakened
      return 1.0;
    case 'misty':   return effectiveTypeId === 16 ? 0.5 : 1.0; // Dragon moves halved
    case 'psychic': return effectiveTypeId === 14 ? 1.3 : 1.0; // Psychic moves boosted
    default:        return 1.0;
  }
}

export const WEATHER_INFO: Record<Exclude<Weather, 'none'>, {
  label: string;
  icon: string;
  bg: string;
  color: string;
  description: string;
}> = {
  sun:  { label: 'Sun',  icon: '☀️',  bg: '#fef9c3', color: '#713f12', description: 'Fire moves ×1.5. Water moves ×0.5. Powers up Solar Power ability.' },
  rain: { label: 'Rain', icon: '🌧️', bg: '#dbeafe', color: '#1e3a8a', description: 'Water moves ×1.5. Fire moves ×0.5. Powers up Swift Swim.' },
  sand: { label: 'Sand', icon: '🌪️', bg: '#fef3c7', color: '#78350f', description: 'Rock-type Sp. Def ×1.5. Powers up Sand Force ability (Rock/Ground/Steel ×1.3).' },
  snow: { label: 'Snow', icon: '❄️',  bg: '#e0f2fe', color: '#075985', description: 'Ice-type Defense ×1.5. Blizzard never misses.' },
};

/** Multiplier that weather applies to a move's effective type (after ability type override). */
export function getWeatherMult(weather: Weather, effectiveTypeId: number): number {
  if (weather === 'sun'  && effectiveTypeId === 10) return 1.5; // Fire boosted
  if (weather === 'sun'  && effectiveTypeId === 11) return 0.5; // Water weakened
  if (weather === 'rain' && effectiveTypeId === 11) return 1.5; // Water boosted
  if (weather === 'rain' && effectiveTypeId === 10) return 0.5; // Fire weakened
  return 1.0;
}

/**
 * Multiplier that weather applies to the **defender's** effective stat.
 *   Sand → Rock-type gains ×1.5 Sp. Def (special moves only; Psyshock hits Def so not affected)
 *   Snow → Ice-type gains ×1.5 Def     (physical moves and Psyshock)
 *
 * @param isPhysical   true if the attacking move is physical
 * @param isPsyshock   true if the attacking move is Psyshock / Psystrike / Secret Sword
 * @param targetTypeIds array of the defending Pokémon's type IDs
 */
export function getWeatherDefMult(
  weather: Weather,
  isPhysical: boolean,
  isPsyshock: boolean,
  targetTypeIds: number[],
): number {
  const hitsSpDef = !isPhysical && !isPsyshock;
  const hitsDef   =  isPhysical ||  isPsyshock;
  if (weather === 'sand' && hitsSpDef && targetTypeIds.includes(6))  return 1.5; // Rock SpDef
  if (weather === 'snow' && hitsDef   && targetTypeIds.includes(15)) return 1.5; // Ice Def
  return 1.0;
}

/** Modifier applied by an attacker's ability to a specific move. */
interface AbilityMod {
  powerMult: number;
  typeOverride: number | null;
  stabMult: number | null; // null = default 1.5
  accMult: number;
  /**
   * When true the attacker always receives STAB on this move regardless of its own typing.
   * Used by Protean / Libero: the Pokémon changes to the move's type before attacking,
   * guaranteeing the ×1.5 bonus on every move it uses.
   */
  forceStab?: boolean;
}

/**
 * Returns an ability modifier for the given move, or null if the ability has no effect.
 * Some abilities (Solar Power, Sand Force) are weather-dependent — pass the active weather.
 */
function getAbilityMod(
  abilityIdentifier: string,
  move: Move,
  attackerTypeIds: number[],
  isPhysical: boolean,
  weather: Weather = 'none',
): AbilityMod | null {
  const mod = (powerMult: number, opts: Partial<Omit<AbilityMod, 'powerMult'>> = {}): AbilityMod => ({
    powerMult,
    typeOverride: opts.typeOverride ?? null,
    stabMult: opts.stabMult ?? null,
    accMult: opts.accMult ?? 1.0,
    forceStab: opts.forceStab,
  });

  switch (abilityIdentifier) {
    // ── Flag-based power boosts ────────────────────────────────────────────
    case 'technician':   return move.power <= 60 ? mod(1.5) : null;
    case 'iron-fist':    return move.flags.includes('punch')   ? mod(1.2) : null;
    case 'strong-jaw':   return move.flags.includes('bite')    ? mod(1.5) : null;
    case 'mega-launcher':return move.flags.includes('pulse')   ? mod(1.5) : null;
    case 'tough-claws':  return move.flags.includes('contact') ? mod(1.3) : null;
    case 'punk-rock':    return move.flags.includes('sound')   ? mod(1.3) : null;
    case 'sheer-force':
      if (SHEER_FORCE_EXCLUDED_EFFECT_IDS.has(move.effectId)) return null;
      return (move.effectChance !== null && move.effectChance > 0) || SHEER_FORCE_ALWAYS_MOVE_IDS.has(move.id)
        ? mod(1.3) : null;

    // ── Type-based power boosts ────────────────────────────────────────────
    case 'steelworker':  return move.typeId === 9  ? mod(1.5) : null; // Steel
    case 'transistor':   return move.typeId === 13 ? mod(1.3) : null; // Electric
    case 'dragons-maw':  return move.typeId === 16 ? mod(1.5) : null; // Dragon

    // ── STAB multiplier override ───────────────────────────────────────────
    case 'adaptability':
      return attackerTypeIds.includes(move.typeId) ? mod(1.0, { stabMult: 2.0 }) : null;

    // ── Always-STAB abilities ──────────────────────────────────────────────
    // Protean (Greninja, Kecleon, …) and Libero (Cinderace) change the user's
    // type to match the move before it hits — the user always gets STAB.
    // In Gen 9 this only activates once per battle, but we model each OHKO
    // attempt as the first move used, so it always applies here.
    case 'protean':
    case 'libero':
      // Only grant the bonus if the move wouldn't already be STAB (avoids double-counting).
      return attackerTypeIds.includes(move.typeId) ? null : mod(1.0, { forceStab: true });

    // ── Type-converting abilities (Normal → X, ×1.2) ──────────────────────
    case 'pixilate':    return move.typeId === 1 ? mod(1.2, { typeOverride: 18 }) : null;
    case 'refrigerate': return move.typeId === 1 ? mod(1.2, { typeOverride: 15 }) : null;
    case 'aerilate':    return move.typeId === 1 ? mod(1.2, { typeOverride: 3  }) : null;
    case 'galvanize':   return move.typeId === 1 ? mod(1.2, { typeOverride: 13 }) : null;

    // ── Stat multipliers ───────────────────────────────────────────────────
    case 'hustle':
      return isPhysical ? mod(1.5, { accMult: 0.8 }) : null;

    // ── Weather-dependent abilities ────────────────────────────────────────
    case 'solar-power':
      // Boosts SpA ×1.5 in sun (special moves only)
      return (weather === 'sun' && !isPhysical) ? mod(1.5) : null;
    case 'sand-force':
      // Boosts Rock/Ground/Steel ×1.3 in sand
      if (weather !== 'sand') return null;
      return [5, 6, 9].includes(move.typeId) ? mod(1.3) : null; // Ground=5, Rock=6, Steel=9

    default: return null;
  }
}

export interface OHKOMoveInfo {
  move: Move;
  minDamage: number;
  maxDamage: number;
  targetHP: number;
  isGuaranteed: boolean;
  typeEffectiveness: number;
  stab: boolean;
  accuracy: number | null;
  evNeeded: number;
  item?: HeldItem;
  abilityMod?: { identifier: string; name: string; isHidden: boolean };
  /** Defensive ability of the target that modified the damage for this OHKO. */
  defAbility?: { identifier: string; name: string; mult: number };
  /** EVs needed without the defensive ability — present only when defAbility is set. */
  baseEvNeeded?: number;
  /** Weather condition that was required for this OHKO (absent = works without weather). */
  weatherRequired?: Exclude<Weather, 'none'>;
  /** For Foul Play only: the target's Attack stat that was used in the damage calculation. */
  foulPlayAtk?: number;
  /** For Round only: true when the base-power OHKO fails but the doubled power (×2) achieves it. */
  needsRoundBoost?: boolean;
  /** Avalanche / Revenge / Payback: calculated at ×2 power (assumes user moves after target). */
  needsGoingSecond?: boolean;
  /** Attacker nature required for this OHKO — absent means neutral nature suffices. */
  nature?: '+atk' | '+spa';
  /**
   * For multi-hit moves: the number of hits needed to KO the target with these EVs.
   * Reflects worst-case RNG (minimum damage per hit) for guaranteed mode,
   * and best-case RNG (maximum damage per hit) for possible mode.
   */
  hitsRequired?: number;
  /**
   * True when the KO is achieved because a multi-hit move (or Parental Bond) breaks
   * Sturdy on the first hit, allowing subsequent hits to finish the target.
   * Implies hitsRequired = 2 and the damage numbers shown are for 2 hits total.
   */
  breaksSturdy?: boolean;
  /**
   * True when the KO is achieved because a multi-hit move (or Parental Bond) breaks
   * the target's Focus Sash on the first hit, with subsequent hits finishing the target.
   * Unlike Sturdy, Mold Breaker has no effect on Focus Sash.
   * Implies hitsRequired = 2.
   */
  breaksSash?: boolean;
  /**
   * True when this move requires a charge turn and cannot OHKO in a single action.
   * Weather-conditional two-turn moves (Solar Beam in Sun, Electro Shot in Rain) do NOT
   * have this flag set when the relevant weather is active.
   */
  twoTurn?: boolean;
  coveredTargetIndices: number[];
}

export interface PokemonOHKOResult {
  pokemon: Pokemon;
  movesPerTarget: OHKOMoveInfo[][];
  allGuaranteed: boolean;
}

const TYPE_BOOST_ITEMS: Record<number, HeldItem> = {
  1:  { name: 'Silk Scarf',     identifier: 'silk-scarf',     boost: 1.2 },
  2:  { name: 'Black Belt',     identifier: 'black-belt',     boost: 1.2 },
  3:  { name: 'Sharp Beak',     identifier: 'sharp-beak',     boost: 1.2 },
  4:  { name: 'Poison Barb',    identifier: 'poison-barb',    boost: 1.2 },
  5:  { name: 'Soft Sand',      identifier: 'soft-sand',      boost: 1.2 },
  6:  { name: 'Hard Stone',     identifier: 'hard-stone',     boost: 1.2 },
  7:  { name: 'Silver Powder',  identifier: 'silver-powder',  boost: 1.2 },
  8:  { name: 'Spell Tag',      identifier: 'spell-tag',      boost: 1.2 },
  9:  { name: 'Metal Coat',     identifier: 'metal-coat',     boost: 1.2 },
  10: { name: 'Charcoal',       identifier: 'charcoal',       boost: 1.2 },
  11: { name: 'Mystic Water',   identifier: 'mystic-water',   boost: 1.2 },
  12: { name: 'Miracle Seed',   identifier: 'miracle-seed',   boost: 1.2 },
  13: { name: 'Magnet',         identifier: 'magnet',         boost: 1.2 },
  14: { name: 'Twisted Spoon',  identifier: 'twisted-spoon',  boost: 1.2 },
  15: { name: 'Never-Melt Ice', identifier: 'never-melt-ice', boost: 1.2 },
  16: { name: 'Dragon Fang',    identifier: 'dragon-fang',    boost: 1.2 },
  17: { name: 'Black Glasses',  identifier: 'black-glasses',  boost: 1.2 },
  18: { name: 'Fairy Feather',  identifier: 'fairy-feather',  boost: 1.2 },
};

export function calcHP(base: number, ev = 0, iv = 31, level = 50): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

export function calcStat(base: number, ev = 0, iv = 31, level = 50, nature = 1.0): number {
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * nature);
}

/**
 * Converts a stat stage (−6 to +6) to its in-battle multiplier.
 * Positive: (2 + stage) / 2   →  +1 = ×1.5,  +2 = ×2.0,  +6 = ×4.0
 * Negative:  2 / (2 − stage)  →  −1 = ×0.667, −2 = ×0.5, −6 = ×0.25
 */
export function stageMult(stage: number): number {
  const s = Math.max(-6, Math.min(6, stage));
  return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
}

export function damageSingle(
  power: number,
  atk: number,
  def: number,
  stabFactor: number,
  effFactor: number,
  itemMult = 1.0,
): { min: number; max: number } {
  if (def <= 0) return { min: 0, max: 0 };
  const base = Math.floor(Math.floor(22 * power * atk / def) / 50) + 2;
  const afterStab = Math.floor(base * stabFactor);
  const afterType = Math.floor(afterStab * (effFactor / 100));
  const maxDmg = Math.floor(afterType * itemMult);
  const minDmg = Math.floor(maxDmg * 0.85);
  return { min: minDmg, max: maxDmg };
}

/** Power of Low Kick / Grass Knot based on target weight in kg. */
function lowKickPower(kg: number): number {
  if (kg >= 200) return 120;
  if (kg >= 100) return 100;
  if (kg >= 50)  return 80;
  if (kg >= 25)  return 60;
  if (kg >= 10)  return 40;
  return 20;
}

/** Power of Heavy Slam / Heat Crash based on (attacker weight) / (target weight) ratio. */
function heavySlamPower(ratio: number): number {
  if (ratio > 5) return 120;
  if (ratio > 4) return 100;
  if (ratio > 3) return 80;
  if (ratio > 2) return 60;
  return 40;
}

function getEffectiveness(
  moveTypeId: number,
  targetTypeIds: number[],
  typeEfficacy: Map<string, number>
): number {
  let factor = 100;
  for (const defType of targetTypeIds) {
    const f = typeEfficacy.get(`${moveTypeId}-${defType}`) ?? 100;
    factor = factor * f / 100;
  }
  return factor;
}

function minEVsToOHKO(
  power: number,
  atkBase: number,
  def: number,
  targetHP: number,
  stabFactor: number,
  effFactor: number,
  guaranteed: boolean,
  itemMult = 1.0,
  atkStageMult = 1.0,
  step = 4,
  maxEV = 252,
): number | null {
  for (let ev = 0; ev <= maxEV; ev += step) {
    const atk = Math.floor(calcStat(atkBase, ev, 31, 50, 1.0) * atkStageMult);
    const { min, max } = damageSingle(power, atk, def, stabFactor, effFactor, itemMult);
    if (guaranteed ? min >= targetHP : max >= targetHP) return ev;
  }
  return null;
}

interface TargetStats {
  pokemon: Pokemon;
  hp: number;
  atk: number;  // used by Foul Play
  def: number;
  spd: number;
  spe: number;    // target's Speed stat (used by Gyro Ball)
  weight: number; // target's weight in kg (used by Heavy Slam / Low Kick)
  defMult: number;
  spdMult: number;
  accuracyMult: number;
  typeResists: { typeId: number; mult: number }[];
  reflect: boolean;
  lightScreen: boolean;
  friendGuard: boolean;
  atkStage: number;
  defStage: number;
  spdStage: number;
  selectedAbilityIdentifier?: string;
  heldItem?: TargetHeldItem;
}

interface OHKOAttempt {
  evNeeded: number;
  /** EVs needed without the defensive ability applied — set only when defAbility is present. */
  baseEvNeeded?: number;
  item?: HeldItem;
  stab: boolean;
  effFactor: number;
  minDmg: number;
  maxDmg: number;
  adjAccuracy: number | null;
  needsRoundBoost?: boolean;
  needsGoingSecond?: boolean;
  defAbility?: { identifier: string; name: string; mult: number };
  /** For multi-hit moves: how many hits were needed to KO (already factored into minDmg/maxDmg). */
  hitsRequired?: number;
  /** True when the KO bypasses Sturdy via multi-hit first-hit + subsequent-hit mechanic. */
  breaksSturdy?: boolean;
  /** True when the KO bypasses Focus Sash via multi-hit first-hit + subsequent-hit mechanic. */
  breaksSash?: boolean;
  /** True when this move requires a charge turn (two-turn move). */
  twoTurn?: boolean;
}

/**
 * Returns whether a target's ability causes immunity or a damage multiplier
 * for the given move. Returns { immune: true } if the move is blocked entirely,
 * or { immune: false, mult } where mult ≠ 1.0 if the damage is modified.
 */
function applyTargetAbility(
  identifier: string,
  effectiveTypeId: number,
  _effFactor: number,
  isPhysical: boolean,
  isContact: boolean,
  isSound: boolean,
): { immune: boolean; mult: number } {
  const none = { immune: false, mult: 1.0 };
  switch (identifier) {
    // ── Full immunities ────────────────────────────────────────────────────
    case 'levitate':       return effectiveTypeId === 5  ? { immune: true, mult: 0 } : none; // Ground
    case 'flash-fire':     return effectiveTypeId === 10 ? { immune: true, mult: 0 } : none; // Fire
    case 'water-absorb':
    case 'dry-skin':       return effectiveTypeId === 11 ? { immune: true, mult: 0 } : none; // Water
    case 'volt-absorb':
    case 'motor-drive':
    case 'lightning-rod':  return effectiveTypeId === 13 ? { immune: true, mult: 0 } : none; // Electric
    case 'sap-sipper':     return effectiveTypeId === 12 ? { immune: true, mult: 0 } : none; // Grass
    case 'earth-eater':    return effectiveTypeId === 5  ? { immune: true, mult: 0 } : none; // Ground
    case 'storm-drain':    return effectiveTypeId === 11 ? { immune: true, mult: 0 } : none; // Water (redirects)
    case 'soundproof':     return isSound ? { immune: true, mult: 0 } : none;
    case 'bulletproof':    return none; // handled by ballistics flag — not tracked here since we don't filter ballistics moves
    // ── Damage reductions ─────────────────────────────────────────────────
    case 'multiscale':
    case 'shadow-shield':  return { immune: false, mult: 0.5 }; // at full HP — we always apply it conservatively
    case 'thick-fat':      return (effectiveTypeId === 10 || effectiveTypeId === 15) ? { immune: false, mult: 0.5 } : none; // Fire/Ice
    case 'filter':
    case 'solid-rock':
    case 'prism-armor':    return _effFactor > 100 ? { immune: false, mult: 0.75 } : none; // reduces super-effective damage
    case 'ice-scales':     return isPhysical ? none : { immune: false, mult: 0.5 }; // halves special damage
    case 'fluffy':
      if (isContact) return { immune: false, mult: 0.5 };
      if (effectiveTypeId === 10) return { immune: false, mult: 2.0 }; // Fire amplified
      return none;
    case 'punk-rock':      return isSound ? { immune: false, mult: 0.5 } : none; // halves incoming sound moves
    case 'heatproof':      return effectiveTypeId === 10 ? { immune: false, mult: 0.5 } : none; // Fire
    case 'water-bubble':   return effectiveTypeId === 10 ? { immune: false, mult: 0.5 } : none; // Fire halved
    case 'purifying-salt': return effectiveTypeId === 8  ? { immune: false, mult: 0.5 } : none; // Ghost
    default: return none;
  }
}

/**
 * Identifiers for abilities that bypass Sturdy (like Mold Breaker).
 * Teravolt and Turboblaze are functionally equivalent to Mold Breaker.
 */
const STURDY_BYPASS_ABILITIES = new Set(['mold-breaker', 'teravolt', 'turboblaze']);

/**
 * Parental Bond — only available on Mega Kangaskhan (Pokémon ID 10039).
 * Makes every move hit twice (100% + 25%), effectively breaking Sturdy on the first hit.
 */
const PARENTAL_BOND_POKEMON_ID = 10039;

function tryOHKO(
  move: Move,
  atkBase: number,
  attackerTypeIds: number[],
  ts: TargetStats,
  data: GameData,
  showPossible: boolean,
  minAccuracy: number,
  abilityMod: AbilityMod | null,
  weather: Weather,
  isDoubles: boolean,
  gravity: boolean,
  terrain: Terrain,
  fairyAura: boolean,
  atkStage: number,
  spaStage: number,
  atkDefStage: number,
  atkItemMult = 1.0,
  spaItemMult = 1.0,
  atkNatureMult = 1.0,
  spaNatureMult = 1.0,
  evStep = 4,
  maxAttackerEV = 252,
  attackerWeight: number = 0,
  attackerSpe: number = 0,
  /** Whether the attacker has Mold Breaker, Teravolt, or Turboblaze (bypasses Sturdy). */
  hasMoldBreaker = false,
  /** Whether the attacker has Parental Bond (Mega Kangaskhan), which also bypasses Sturdy. */
  hasParentalBond = false,
  /** Whether the attacker can hold a type-boost item. False for Mega/Primal Pokémon (they hold their transformation item). */
  allowTypeItem = true,
): OHKOAttempt | null {
  // ── Two-turn move flag ────────────────────────────────────────────────────
  // Moves that require a charge turn are tagged so the UI can display a chip
  // and offer a filter to hide them. Solar Beam/Blade are one-turn in Sun;
  // Electro Shot is one-turn in Rain — those are not flagged when the weather matches.
  const isTwoTurn =
    move.twoTurn === 'always' ||
    (move.twoTurn === 'no-sun'  && weather !== 'sun')  ||
    (move.twoTurn === 'no-rain' && weather !== 'rain');

  const effectiveTypeId = abilityMod?.typeOverride ?? move.typeId;

  // Gravity boosts all finite accuracy values by ×5/3 (capped at 100)
  const baseAcc = move.accuracy === null ? null
    : gravity ? Math.min(100, Math.floor(move.accuracy * 5 / 3))
    : move.accuracy;
  const adjAccuracy = baseAcc === null
    ? null
    : baseAcc * ts.accuracyMult * (abilityMod?.accMult ?? 1.0);
  if (adjAccuracy !== null && adjAccuracy < minAccuracy) return null;

  let effFactor = getEffectiveness(effectiveTypeId, ts.pokemon.typeIds, data.typeEfficacy);
  if (effFactor === 0) return null;

  const berry = ts.typeResists.find(r => r.typeId === effectiveTypeId);
  if (berry) effFactor = Math.floor(effFactor * berry.mult);

  const isPhysical = move.damageClassId === 2;
  const isContact  = move.flags.includes('contact');
  const isSound    = move.flags.includes('sound');
  // Psyshock/Psystrike/Secret Sword: Special moves that hit the target's Defense, not Sp. Def
  const isPsyshock = PSYSHOCK_MOVE_IDS.has(move.id);

  // Apply the target's selected defensive ability
  let defAbilityMult = 1.0;
  let defAbility: { identifier: string; name: string; mult: number } | undefined;
  if (ts.selectedAbilityIdentifier) {
    const da = ts.pokemon.abilities.find(a => a.identifier === ts.selectedAbilityIdentifier);
    if (da) {
      // Gravity grounds all Pokémon — Levitate's Ground immunity is suppressed.
      const gravityNegated = gravity && da.identifier === 'levitate';
      const effect = gravityNegated
        ? { immune: false, mult: 1.0 }
        : applyTargetAbility(da.identifier, effectiveTypeId, effFactor, isPhysical, isContact, isSound);
      if (effect.immune) return null;
      if (effect.mult !== 1.0) {
        defAbilityMult = effect.mult;
        defAbility = { identifier: da.identifier, name: da.name, mult: effect.mult };
      }
    }
  }

  // ── Sturdy check ──────────────────────────────────────────────────────────
  // Sturdy prevents OHKOs from full HP unless one of the following is true:
  //   1. Attacker has Mold Breaker / Teravolt / Turboblaze (hasMoldBreaker) → Sturdy ignored.
  //   2. Move hits ≥ 2 times guaranteed (multiHit.min ≥ 2) → first hit breaks Sturdy (target at
  //      1 HP), all subsequent hits land normally, so a 2-hit move always finishes the target.
  //   3. Attacker has Parental Bond (hasParentalBond, Mega Kangaskhan only) → same as (2):
  //      every move effectively hits twice.
  const targetHasSturdy = ts.selectedAbilityIdentifier === 'sturdy';
  const multiHitMin2    = (move.multiHit?.min ?? 1) >= 2;
  // Does this interaction bypass Sturdy at all?
  const stuardyBypass = hasMoldBreaker || multiHitMin2 || hasParentalBond;
  if (targetHasSturdy && !stuardyBypass) return null;
  // Is the bypass achieved via multi-hit / Parental Bond (not Mold Breaker)?
  // If so we take a special early-return path — Mold Breaker bypasses silently, so for that
  // case we fall through to the normal single-hit OHKO calc.
  const usesMultiHitSturdyBreak = targetHasSturdy && !hasMoldBreaker && (multiHitMin2 || hasParentalBond);

  // ── Focus Sash check ──────────────────────────────────────────────────────
  // Focus Sash prevents an OHKO from full HP by any single hit, leaving the target at 1 HP.
  // Unlike Sturdy, it is an item — Mold Breaker DOES NOT bypass it.
  // Multi-hit moves (min ≥ 2) and Parental Bond still break it: first hit pops the Sash,
  // subsequent hits finish the target.
  const targetHasFocusSash = ts.heldItem?.focusSash === true;
  const sashBypass = multiHitMin2 || hasParentalBond; // no Mold Breaker
  if (targetHasFocusSash && !sashBypass) return null;
  const usesMultiHitSashBreak = targetHasFocusSash && (multiHitMin2 || hasParentalBond);

  const rawDef = (isPhysical || isPsyshock) ? ts.def : ts.spd;
  const targetStageMult = (isPhysical || isPsyshock) ? stageMult(ts.defStage) : stageMult(ts.spdStage);
  const statMult = (isPhysical || isPsyshock) ? ts.defMult : ts.spdMult;
  // Screens: singles = ×0.5 damage (×2.0 defense), doubles = ×2/3 damage (×1.5 defense)
  // Screen type is based on move category (Psyshock is special → Light Screen applies)
  const screenDefMult = isDoubles ? 1.5 : 2.0;
  const screenMult = isPhysical ? (ts.reflect ? screenDefMult : 1.0) : (ts.lightScreen ? screenDefMult : 1.0);
  // Weather-based defensive stat boosts on the target:
  //   Sand → Rock-type Pokémon gain ×1.5 Sp. Def (special moves only; Psyshock hits Def so not affected)
  //   Snow → Ice-type Pokémon gain ×1.5 Def (physical moves and Psyshock)
  const weatherStatMult = getWeatherDefMult(weather, isPhysical, isPsyshock, ts.pokemon.typeIds);
  const defStat = Math.floor(rawDef * targetStageMult * statMult * screenMult * weatherStatMult);

  // Attacker stat stage — physical uses atkStage, special uses spaStage.
  // Foul Play uses the target's Attack, so attacker stages don't apply.
  // Body Press uses the attacker's Defense, so it uses atkDefStage instead.
  // Electro Shot charges SpA by +1 on the charge turn — this bonus applies whether or not
  // Rain is active (in Rain both turns happen simultaneously but the boost still fires).
  // The stage is capped at +6 per normal rules.
  const effectiveSpaStage = move.id === ELECTRO_SHOT_MOVE_ID ? Math.min(6, spaStage + 1) : spaStage;
  const atkStageMult = move.id === FOUL_PLAY_MOVE_ID ? 1.0
    : move.id === BODY_PRESS_MOVE_ID ? stageMult(atkDefStage)
    : stageMult(isPhysical ? atkStage : effectiveSpaStage);

  // Choice item multiplier: Band boosts physical (not Foul Play / Body Press), Specs boosts special.
  // Body Press scales off Defense (not Attack), so Choice Band doesn't apply.
  // Foul Play uses the target's Attack (not attacker's), so Choice Band doesn't apply.
  const choiceItemMult = (isPhysical && move.id !== FOUL_PLAY_MOVE_ID && move.id !== BODY_PRESS_MOVE_ID)
    ? atkItemMult
    : (!isPhysical ? spaItemMult : 1.0);

  // Nature multiplier: +10% to physical (Adamant-like) or special (Modest-like) moves.
  // Foul Play uses target's Atk; Body Press uses attacker's Def — neither benefits from an offensive nature.
  const natureMult = (isPhysical && move.id !== FOUL_PLAY_MOVE_ID && move.id !== BODY_PRESS_MOVE_ID)
    ? atkNatureMult
    : (!isPhysical ? spaNatureMult : 1.0);

  const atkTotalMult = atkStageMult * choiceItemMult * natureMult;

  // Protean / Libero force STAB on every move (abilityMod.forceStab).
  // Type-converting abilities (Pixilate etc.) change effectiveTypeId, so the standard
  // attackerTypeIds check handles those — forceStab is only needed for Protean/Libero.
  const stab = (abilityMod?.forceStab ?? false) || attackerTypeIds.includes(effectiveTypeId);
  const stabFactor = stab ? (abilityMod?.stabMult ?? 1.5) : 1.0;

  // Weather multiplies the effective power (after ability)
  const weatherMult  = getWeatherMult(weather, effectiveTypeId);
  // Terrain multiplies the effective power
  const terrainMult  = getTerrainMult(terrain, move.id, effectiveTypeId);
  // Fairy Aura boosts all Fairy-type moves ×4/3 for every Pokémon on the field
  const fairyAuraMult = (fairyAura && effectiveTypeId === 18) ? (4 / 3) : 1.0;
  // Spread moves deal ×0.75 damage in doubles format
  const spreadMult = (isDoubles && move.isSpread) ? 0.75 : 1.0;
  // Friend Guard (doubles only): adjacent ally reduces all incoming damage by ×0.75
  const friendGuardMult = ts.friendGuard ? 0.75 : 1.0;
  // ── Variable-power moves ───────────────────────────────────────────────────
  // Low Kick / Grass Knot: power scales with target weight.
  // Heavy Slam / Heat Crash: power scales with attacker/target weight ratio.
  // Gyro Ball: power = min(150, floor(25 × targetSpe / attackerSpe)); slower attacker = more power.
  let resolvedPower = move.power;
  if (move.variablePower === 'low-kick') {
    resolvedPower = lowKickPower(ts.weight);
  } else if (move.variablePower === 'heavy-slam') {
    if (ts.weight <= 0) return null;
    resolvedPower = heavySlamPower(attackerWeight / ts.weight);
  } else if (move.variablePower === 'gyro-ball') {
    if (attackerSpe <= 0) return null;
    resolvedPower = Math.min(150, Math.floor(25 * ts.spe / attackerSpe));
    if (resolvedPower <= 0) return null;
  }

  // Avalanche / Revenge / Payback: always calculated at double power.
  // These moves are only ever used when the condition applies (going last / being hit first).
  const goingSecondMult = GOING_SECOND_EFFECT_IDS.has(move.effectId) ? 2.0 : 1.0;
  const effectivePower = resolvedPower * goingSecondMult * (abilityMod?.powerMult ?? 1.0) * weatherMult * terrainMult * fairyAuraMult * spreadMult * friendGuardMult * defAbilityMult;
  const needsGoingSecond = goingSecondMult === 2.0;
  let activePower = effectivePower; // may be doubled for Round
  let needsRoundBoost = false;

  // Foul Play uses the target's Attack stat — the attacker invests no EVs
  const isFoulPlay = move.id === FOUL_PLAY_MOVE_ID;

  // ── Sturdy-break via multi-hit fast path ──────────────────────────────────
  // The first hit triggers Sturdy (target survives at 1 HP), and the second hit finishes
  // the target — no EV investment is needed beyond dealing > 0 damage per hit.
  // We show 2 × single-hit damage as the effective total to give the user a reference
  // for how much damage Sturdy "ate" relative to their offensive stat.
  if (usesMultiHitSturdyBreak) {
    const atkStat0 = Math.floor(calcStat(atkBase, 0, 31, 50, 1.0) * atkTotalMult);
    const { min: s1, max: s2 } = damageSingle(activePower, atkStat0, defStat, stabFactor, effFactor, 1.0);
    if (s2 <= 0) return null; // move does zero damage even before Sturdy — can't trigger it
    return {
      evNeeded: 0, item: undefined, stab, effFactor,
      minDmg: s1 * 2, maxDmg: s2 * 2,
      adjAccuracy, needsGoingSecond, hitsRequired: 2, breaksSturdy: true, twoTurn: isTwoTurn || undefined,
    };
  }

  // ── Focus Sash-break via multi-hit fast path ──────────────────────────────
  // Identical logic to Sturdy-break: first hit pops the Sash (target at 1 HP),
  // second hit finishes. No EV investment needed beyond dealing > 0 damage.
  if (usesMultiHitSashBreak) {
    const atkStat0 = Math.floor(calcStat(atkBase, 0, 31, 50, 1.0) * atkTotalMult);
    const { min: s1, max: s2 } = damageSingle(activePower, atkStat0, defStat, stabFactor, effFactor, 1.0);
    if (s2 <= 0) return null; // move does zero damage — can't pop the Sash
    return {
      evNeeded: 0, item: undefined, stab, effFactor,
      minDmg: s1 * 2, maxDmg: s2 * 2,
      adjAccuracy, needsGoingSecond, hitsRequired: 2, breaksSash: true, twoTurn: isTwoTurn || undefined,
    };
  }

  let evNeeded: number | null;
  let item: HeldItem | undefined;

  // ── Multi-hit: scale target HP for the EV search ──────────────────────────
  // For a guaranteed OHKO: need multiHit.min hits × minDmg ≥ targetHP
  //   → equivalent to minDmg ≥ ⌈targetHP / minHits⌉ → use scaledTargetHP = ⌈hp / minHits⌉
  // For a possible OHKO:   need multiHit.max hits × maxDmg ≥ targetHP
  //   → scaledTargetHP = ⌈hp / maxHits⌉
  // Single-hit moves (or Mold Breaker bypassing Sturdy) use unscaled HP.
  const multiHitCount = !showPossible
    ? (move.multiHit?.min ?? 1)
    : (move.multiHit?.max ?? 1);
  const scaledTargetHP = move.multiHit
    ? Math.ceil(ts.hp / multiHitCount)
    : ts.hp;

  if (isFoulPlay) {
    // Foul Play uses the target's Attack including their active Attack stage
    const foulPlayAtk = Math.floor(ts.atk * stageMult(ts.atkStage));
    const { min, max } = damageSingle(effectivePower, foulPlayAtk, defStat, stabFactor, effFactor, 1.0);
    const lands = !showPossible ? min >= scaledTargetHP : max >= scaledTargetHP;
    if (!lands) return null;
    evNeeded = 0;
  } else {
    evNeeded = minEVsToOHKO(activePower, atkBase, defStat, scaledTargetHP, stabFactor, effFactor, !showPossible, 1.0, atkTotalMult, evStep, maxAttackerEV);

    // Only fall back to a type-boosting item if no choice item is active — can't hold two items.
    // Mega/Primal Pokémon hold their transformation item and cannot hold type-boost items.
    if (evNeeded === null && choiceItemMult === 1.0 && allowTypeItem) {
      const typeItem = TYPE_BOOST_ITEMS[effectiveTypeId];
      if (typeItem) {
        evNeeded = minEVsToOHKO(activePower, atkBase, defStat, scaledTargetHP, stabFactor, effFactor, !showPossible, typeItem.boost, atkTotalMult, evStep, maxAttackerEV);
        if (evNeeded !== null) item = typeItem;
      }
    }

    // Round: if base power fails, retry at double power (another Pokémon used Round first).
    if (evNeeded === null && move.id === ROUND_MOVE_ID) {
      item = undefined;
      activePower = effectivePower * 2;
      evNeeded = minEVsToOHKO(activePower, atkBase, defStat, scaledTargetHP, stabFactor, effFactor, !showPossible, 1.0, atkTotalMult, evStep, maxAttackerEV);
      if (evNeeded === null && choiceItemMult === 1.0 && allowTypeItem) {
        const typeItem = TYPE_BOOST_ITEMS[effectiveTypeId];
        if (typeItem) {
          evNeeded = minEVsToOHKO(activePower, atkBase, defStat, scaledTargetHP, stabFactor, effFactor, !showPossible, typeItem.boost, atkTotalMult, evStep, maxAttackerEV);
          if (evNeeded !== null) item = typeItem;
        }
      }
      if (evNeeded !== null) needsRoundBoost = true;
    }

    if (evNeeded === null) return null;
  }

  // If a defensive ability is reducing/amplifying damage, compute the baseline EVs (without
  // the ability) so the tooltip can show how many extra EVs the ability is responsible for.
  let baseEvNeeded: number | undefined;
  if (defAbility && !isFoulPlay) {
    const basePower = activePower / defAbilityMult;
    baseEvNeeded = minEVsToOHKO(basePower, atkBase, defStat, scaledTargetHP, stabFactor, effFactor, !showPossible, item?.boost ?? 1.0, atkTotalMult, evStep, maxAttackerEV) ?? undefined;
  }

  const atkStat = isFoulPlay
    ? Math.floor(ts.atk * stageMult(ts.atkStage))
    : Math.floor(calcStat(atkBase, evNeeded, 31, 50, 1.0) * atkTotalMult);
  const { min: singleMin, max: singleMax } = damageSingle(activePower, atkStat, defStat, stabFactor, effFactor, item?.boost ?? 1.0);

  // ── Multi-hit: compute actual hits needed and total damage ─────────────────
  // With the chosen EVs, work out the exact number of hits required:
  //   worst-case RNG (minDmg/hit) for guaranteed mode, best-case (maxDmg/hit) for possible.
  // The displayed min/max damage is total damage across all required hits.
  let hitsRequired: number | undefined;
  let totalMin = singleMin;
  let totalMax = singleMax;
  if (move.multiHit) {
    const dmgPerHit = !showPossible ? singleMin : singleMax;
    const raw = dmgPerHit > 0 ? Math.ceil(ts.hp / dmgPerHit) : move.multiHit.max;
    hitsRequired = Math.max(1, Math.min(raw, move.multiHit.max));
    totalMin = singleMin * hitsRequired;
    totalMax = singleMax * hitsRequired;
  }

  return { evNeeded, baseEvNeeded, item, stab, effFactor, minDmg: totalMin, maxDmg: totalMax, adjAccuracy, needsRoundBoost, needsGoingSecond, defAbility, hitsRequired, twoTurn: isTwoTurn || undefined };
}

export function findPokemonOHKOs(
  targets: TargetConfig[],
  data: GameData,
  showPossible = false,
  minAccuracy = 0,
  weather: Weather = 'none',
  isDoubles = true,
  gravity = false,
  terrain: Terrain = 'none',
  fairyAura = false,
  atkStage = 0,
  spaStage = 0,
  atkDefStage = 0,
  atkItemMult = 1.0,
  spaItemMult = 1.0,
  /** EV increment used when searching for the minimum attacker EVs needed. Use 8 for SP mode (1 SP = 8 EVs). */
  evStep = 4,
  /** Maximum attacker EV to consider. Use 256 for SP mode (32 SPs × 8). */
  maxAttackerEV = 252,
): PokemonOHKOResult[] {
  if (targets.length === 0) return [];

  const targetStats: TargetStats[] = targets.map(t => ({
    pokemon: t.pokemon,
    hp: calcHP(t.pokemon.stats.hp, t.evs.hp),
    atk: calcStat(t.pokemon.stats.atk, t.evs.atk, 31, 50, t.atkNature ?? 1.0),
    def: calcStat(t.pokemon.stats.def, t.evs.def, 31, 50, t.defNature ?? 1.0),
    spd: calcStat(t.pokemon.stats.spd, t.evs.spd, 31, 50, t.spdNature ?? 1.0),
    spe: calcStat(t.pokemon.stats.spe, t.evs.spe ?? 0, 31, 50, t.speNature ?? 1.0),
    weight: t.pokemon.weight,
    defMult: t.heldItem?.defMult ?? 1.0,
    spdMult: t.heldItem?.spdMult ?? 1.0,
    accuracyMult: t.heldItem?.accuracyMult ?? 1.0,
    typeResists: t.heldItem?.typeResists ?? [],
    reflect: t.reflect ?? false,
    lightScreen: t.lightScreen ?? false,
    friendGuard: t.friendGuard ?? false,
    atkStage: t.atkStage ?? 0,
    defStage: t.defStage ?? 0,
    spdStage: t.spdStage ?? 0,
    selectedAbilityIdentifier: t.selectedAbilityIdentifier,
    heldItem: t.heldItem,
  }));

  const results: PokemonOHKOResult[] = [];

  for (const [, attacker] of data.pokemon) {
    const moveIds = data.pokemonMoves.get(attacker.id);
    if (!moveIds) continue;

    // Detect Mold Breaker (and equivalents) and Parental Bond for this attacker.
    // These affect Sturdy bypass logic inside tryOHKO.
    const hasMoldBreaker = attacker.abilities.some(a => STURDY_BYPASS_ABILITIES.has(a.identifier));
    const hasParentalBond = attacker.id === PARENTAL_BOND_POKEMON_ID;
    const attackerSpe = calcStat(attacker.stats.spe, 0, 31, 50, 1.0);
    // Mega and Primal Pokémon hold their transformation item (Mega Stone / Blue/Red Orb)
    // and therefore cannot hold type-boost items like Soft Sand, Charcoal, etc.
    const isMegaAttacker = attacker.identifier.includes('-mega') || attacker.identifier.includes('-primal');

    const movesPerTarget: OHKOMoveInfo[][] = targets.map(() => []);

    for (const moveId of moveIds) {
      const move = data.moves.get(moveId);
      if (!move) continue;
      // Some moves (Fly, Bounce, Jump Kick, High Jump Kick, Sky Drop) can't be used under Gravity
      if (gravity && GRAVITY_UNUSABLE_MOVE_IDS.has(move.id)) continue;

      const isPhysical = move.damageClassId === 2;
      // Body Press deals damage using the attacker's Defense instead of Attack
      const atkBase = move.id === BODY_PRESS_MOVE_ID
        ? attacker.stats.def
        : (isPhysical ? attacker.stats.atk : attacker.stats.spa);

      type AbilityConfig = { mod: AbilityMod | null; ability: typeof attacker.abilities[0] | null };

      /**
       * Abilities that are situationally available and should not suppress a
       * no-ability OHKO result when one exists.
       *
       * Protean / Libero: in Gen 9 these only activate once per battle, and we
       * cannot assume the type-change is available for a given attack. If the
       * move can already OHKO without STAB (just at higher EVs), we prefer to
       * show that result so the player knows the OHKO is always achievable.
       * Protean/Libero only appear in results when the OHKO is impossible
       * without their STAB bonus.
       */
      const FALLBACK_ABILITIES = new Set(['protean', 'libero']);

      // Build ability configs for a given weather (determines which weather-dependent abilities apply).
      // Returns { primary, fallback } — primary configs are tried first; fallback configs only when
      // primary configs produce no result.
      const buildConfigs = (w: Weather): { primary: AbilityConfig[]; fallback: AbilityConfig[] } => {
        const primary:  AbilityConfig[] = [{ mod: null, ability: null }];
        const fallback: AbilityConfig[] = [];
        for (const ability of attacker.abilities) {
          const m = getAbilityMod(ability.identifier, move, attacker.typeIds, isPhysical, w);
          if (!m) continue;
          if (FALLBACK_ABILITIES.has(ability.identifier)) {
            fallback.push({ mod: m, ability });
          } else {
            primary.push({ mod: m, ability });
          }
        }
        return { primary, fallback };
      };

      const tryConfigs = (configs: AbilityConfig[], w: Weather, ts: TargetStats, atkNM = 1.0, spaNM = 1.0) => {
        let best: { attempt: OHKOAttempt; ability: typeof attacker.abilities[0] | null } | null = null;
        for (const { mod, ability } of configs) {
          const attempt = tryOHKO(move, atkBase, attacker.typeIds, ts, data, showPossible, minAccuracy, mod, w, isDoubles, gravity, terrain, fairyAura, atkStage, spaStage, atkDefStage, atkItemMult, spaItemMult, atkNM, spaNM, evStep, maxAttackerEV, attacker.weight, attackerSpe, hasMoldBreaker, hasParentalBond, !isMegaAttacker);
          if (attempt && (!best || attempt.evNeeded < best.attempt.evNeeded)) {
            best = { attempt, ability };
          }
        }
        return best;
      };

      // Find best attempt: primary configs first; fall back to situational abilities
      // (Protean/Libero) only when primary configs cannot achieve the OHKO.
      const findBest = (configs: { primary: AbilityConfig[]; fallback: AbilityConfig[] }, w: Weather, ts: TargetStats, atkNM = 1.0, spaNM = 1.0) =>
        tryConfigs(configs.primary, w, ts, atkNM, spaNM) ?? tryConfigs(configs.fallback, w, ts, atkNM, spaNM);

      const noWeatherConfigs   = buildConfigs('none');
      const withWeatherConfigs = weather !== 'none' ? buildConfigs(weather) : { primary: [], fallback: [] };

      for (let ti = 0; ti < targetStats.length; ti++) {
        const ts = targetStats[ti];

        // ── Neutral nature ────────────────────────────────────────────────────
        // Preference order:
        //  • Weather inactive → use no-weather result.
        //  • Weather active   → ALWAYS use the with-weather result so defensive boosts
        //    (Snow ×1.5 Ice Def, Sand ×1.5 Rock SpDef) and offensive changes are all
        //    reflected in the displayed damage numbers.
        //    - weatherRequired is set only when the OHKO wouldn't work without weather.
        //    - If withWeatherBest is null the move can no longer OHKO under active weather
        //      (e.g. Snow pushes the defender's Def too high) → skip it entirely.

        const noWeatherBest   = findBest(noWeatherConfigs, 'none', ts);
        const withWeatherBest = weather !== 'none' ? findBest(withWeatherConfigs, weather, ts) : null;

        let chosen: OHKOAttempt | null = null;
        let abilityRequired: OHKOMoveInfo['abilityMod'];
        let weatherRequired: OHKOMoveInfo['weatherRequired'];

        if (weather !== 'none') {
          // Active weather: display numbers that reflect the current conditions.
          if (withWeatherBest) {
            chosen = withWeatherBest.attempt;
            abilityRequired = withWeatherBest.ability
              ? { identifier: withWeatherBest.ability.identifier, name: withWeatherBest.ability.name, isHidden: withWeatherBest.ability.isHidden }
              : undefined;
            // Only flag weather as required if the move wouldn't OHKO without it.
            weatherRequired = noWeatherBest ? undefined : weather as Exclude<Weather, 'none'>;
          }
          // else: withWeatherBest null → weather prevents the OHKO → skip (chosen stays null).
        } else {
          if (noWeatherBest) {
            chosen = noWeatherBest.attempt;
            abilityRequired = noWeatherBest.ability
              ? { identifier: noWeatherBest.ability.identifier, name: noWeatherBest.ability.name, isHidden: noWeatherBest.ability.isHidden }
              : undefined;
          }
        }

        if (chosen) {
          movesPerTarget[ti].push({
            move,
            minDamage: chosen.minDmg,
            maxDamage: chosen.maxDmg,
            targetHP: ts.hp,
            isGuaranteed: chosen.minDmg >= ts.hp,
            typeEffectiveness: chosen.effFactor / 100,
            stab: chosen.stab,
            accuracy: chosen.adjAccuracy,
            evNeeded: chosen.evNeeded,
            item: chosen.item,
            abilityMod: abilityRequired,
            defAbility: chosen.defAbility,
            baseEvNeeded: chosen.baseEvNeeded,
            weatherRequired,
            foulPlayAtk: move.id === FOUL_PLAY_MOVE_ID ? Math.floor(ts.atk * stageMult(ts.atkStage)) : undefined,
            needsRoundBoost: chosen.needsRoundBoost,
            needsGoingSecond: chosen.needsGoingSecond,
            hitsRequired: chosen.hitsRequired,
            breaksSturdy: chosen.breaksSturdy,
            breaksSash: chosen.breaksSash,
            twoTurn: chosen.twoTurn,
            coveredTargetIndices: [],
          });
        }

        // ── Nature variant (+Atk or +SpA) ────────────────────────────────────
        // Foul Play and Body Press don't benefit from offensive natures.
        const natureLabel: '+atk' | '+spa' | null =
          (isPhysical && move.id !== FOUL_PLAY_MOVE_ID && move.id !== BODY_PRESS_MOVE_ID) ? '+atk'
          : !isPhysical ? '+spa'
          : null;

        if (natureLabel !== null) {
          const [atkNM, spaNM] = natureLabel === '+atk' ? [1.1, 1.0] : [1.0, 1.1];
          const nwNature = findBest(noWeatherConfigs, 'none', ts, atkNM, spaNM);
          const wwNature = weather !== 'none' ? findBest(withWeatherConfigs, weather, ts, atkNM, spaNM) : null;

          let natureChosen: OHKOAttempt | null = null;
          let natureAbility: OHKOMoveInfo['abilityMod'];
          let natureWeather: OHKOMoveInfo['weatherRequired'];

          if (weather !== 'none') {
            if (wwNature) {
              natureChosen = wwNature.attempt;
              natureAbility = wwNature.ability
                ? { identifier: wwNature.ability.identifier, name: wwNature.ability.name, isHidden: wwNature.ability.isHidden }
                : undefined;
              natureWeather = nwNature ? undefined : weather as Exclude<Weather, 'none'>;
            }
          } else if (nwNature) {
            natureChosen = nwNature.attempt;
            natureAbility = nwNature.ability
              ? { identifier: nwNature.ability.identifier, name: nwNature.ability.name, isHidden: nwNature.ability.isHidden }
              : undefined;
          }

          // Show the nature-variant row when it achieves a strictly lower EV threshold —
          // OR when the neutral result only works via a type-boost item (Soft Sand, etc.),
          // because the nature variant represents a no-item alternative the player may prefer.
          // Without this check, a neutral+item result at evNeeded=0 would suppress the
          // nature+no-item result at evNeeded=124, hiding it from the player entirely.
          const chosenNeedsItem = chosen !== null && chosen.item !== undefined;
          if (natureChosen && (!chosen || chosenNeedsItem || natureChosen.evNeeded < chosen.evNeeded)) {
            movesPerTarget[ti].push({
              move,
              minDamage: natureChosen.minDmg,
              maxDamage: natureChosen.maxDmg,
              targetHP: ts.hp,
              isGuaranteed: natureChosen.minDmg >= ts.hp,
              typeEffectiveness: natureChosen.effFactor / 100,
              stab: natureChosen.stab,
              accuracy: natureChosen.adjAccuracy,
              evNeeded: natureChosen.evNeeded,
              item: natureChosen.item,
              abilityMod: natureAbility,
              defAbility: natureChosen.defAbility,
              baseEvNeeded: natureChosen.baseEvNeeded,
              weatherRequired: natureWeather,
              foulPlayAtk: move.id === FOUL_PLAY_MOVE_ID ? Math.floor(ts.atk * stageMult(ts.atkStage)) : undefined,
              needsRoundBoost: natureChosen.needsRoundBoost,
              needsGoingSecond: natureChosen.needsGoingSecond,
              hitsRequired: natureChosen.hitsRequired,
              breaksSturdy: natureChosen.breaksSturdy,
              breaksSash: natureChosen.breaksSash,
              twoTurn: natureChosen.twoTurn,
              nature: natureLabel,
              coveredTargetIndices: [],
            });
          }
        }
      }
    }

    if (!movesPerTarget.every(moves => moves.length > 0)) continue;

    // Key = "moveId:nature" so neutral and nature-variant rows track independently.
    const moveTargetMap = new Map<string, number[]>();
    for (let ti = 0; ti < movesPerTarget.length; ti++) {
      for (const info of movesPerTarget[ti]) {
        const key = `${info.move.id}:${info.nature ?? ''}`;
        if (!moveTargetMap.has(key)) moveTargetMap.set(key, []);
        moveTargetMap.get(key)!.push(ti);
      }
    }
    for (const moves of movesPerTarget) {
      for (const info of moves) {
        const key = `${info.move.id}:${info.nature ?? ''}`;
        info.coveredTargetIndices = moveTargetMap.get(key)!;
      }
    }

    for (let i = 0; i < movesPerTarget.length; i++) {
      // Primary sort: alphabetical by move name.
      movesPerTarget[i].sort((a, b) => a.move.name.localeCompare(b.move.name));
      // Re-group by move ID so all variants of the same move stay adjacent.
      // The group's position in the list is set by its first appearance (alphabetical order).
      const grouped = new Map<number, OHKOMoveInfo[]>();
      const order: number[] = [];
      for (const m of movesPerTarget[i]) {
        if (!grouped.has(m.move.id)) { grouped.set(m.move.id, []); order.push(m.move.id); }
        grouped.get(m.move.id)!.push(m);
      }
      // Within each group sort by variant type: nature first → neutral → item required.
      // Priority: 0 = nature variant (no item), 1 = nature + item, 2 = neutral (no item), 3 = neutral + item.
      const variantPriority = (m: OHKOMoveInfo) =>
        m.nature !== undefined ? (m.item ? 1 : 0) : (m.item ? 3 : 2);
      for (const id of order) grouped.get(id)!.sort((a, b) => variantPriority(a) - variantPriority(b));
      movesPerTarget[i] = order.flatMap(id => grouped.get(id)!);
    }

    const allGuaranteed = movesPerTarget.every(moves => moves.some(m => m.isGuaranteed));
    results.push({ pokemon: attacker, movesPerTarget, allGuaranteed });
  }

  const bst = (p: Pokemon) =>
    p.stats.hp + p.stats.atk + p.stats.def + p.stats.spa + p.stats.spd + p.stats.spe;

  results.sort((a, b) => {
    if (a.allGuaranteed !== b.allGuaranteed) return a.allGuaranteed ? -1 : 1;
    return bst(b.pokemon) - bst(a.pokemon);
  });

  return results;
}
