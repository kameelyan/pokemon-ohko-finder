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
 * Psyshock, Psystrike, and Secret Sword are Special moves that deal damage
 * using the *target's* Defense stat instead of its Sp. Defense.
 */
export const PSYSHOCK_MOVE_IDS = new Set([473, 540, 548]);

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
}

export interface TargetHeldItem {
  name: string;
  identifier: string;
  defMult: number;
  spdMult: number;
  speedMult: number; // multiplier on the target's Speed stat (for outspeed comparisons)
  accuracyMult: number;
  typeResists: { typeId: number; mult: number }[];
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

function getTerrainMult(terrain: Terrain, moveId: number, effectiveTypeId: number): number {
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
  sun:  { label: 'Sun',  icon: '☀️',  bg: '#fef9c3', color: '#713f12', description: 'Boosts Fire-type moves ×1.5. Powers up Solar Power ability.' },
  rain: { label: 'Rain', icon: '🌧️', bg: '#dbeafe', color: '#1e3a8a', description: 'Boosts Water-type moves ×1.5. Powers up Swift Swim.' },
  sand: { label: 'Sand', icon: '🌪️', bg: '#fef3c7', color: '#78350f', description: 'Powers up Sand Force ability (Rock/Ground/Steel ×1.3).' },
  snow: { label: 'Snow', icon: '❄️',  bg: '#e0f2fe', color: '#075985', description: 'Boosts Ice-type Defense ×1.5. No direct offensive boost.' },
};

/** Multiplier that weather applies to a move's effective type (after ability type override). */
function getWeatherMult(weather: Weather, effectiveTypeId: number): number {
  if (weather === 'sun'  && effectiveTypeId === 10) return 1.5; // Fire
  if (weather === 'rain' && effectiveTypeId === 11) return 1.5; // Water
  return 1.0;
}

/** Modifier applied by an attacker's ability to a specific move. */
interface AbilityMod {
  powerMult: number;
  typeOverride: number | null;
  stabMult: number | null; // null = default 1.5
  accMult: number;
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
  /** Weather condition that was required for this OHKO (absent = works without weather). */
  weatherRequired?: Exclude<Weather, 'none'>;
  /** For Foul Play only: the target's Attack stat that was used in the damage calculation. */
  foulPlayAtk?: number;
  /** For Round only: true when the base-power OHKO fails but the doubled power (×2) achieves it. */
  needsRoundBoost?: boolean;
  /** Defensive ability on the target that reduced (or amplified) damage for this move. */
  defAbility?: { identifier: string; name: string; mult: number };
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

function damageSingle(
  power: number,
  atk: number,
  def: number,
  stabFactor: number,
  effFactor: number,
  itemMult = 1.0,
): { min: number; max: number } {
  const base = Math.floor(Math.floor(22 * power * atk / def) / 50) + 2;
  const afterStab = Math.floor(base * stabFactor);
  const afterType = Math.floor(afterStab * (effFactor / 100));
  const maxDmg = Math.floor(afterType * itemMult);
  const minDmg = Math.floor(maxDmg * 0.85);
  return { min: minDmg, max: maxDmg };
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
}

interface OHKOAttempt {
  evNeeded: number;
  item?: HeldItem;
  stab: boolean;
  effFactor: number;
  minDmg: number;
  maxDmg: number;
  adjAccuracy: number | null;
  needsRoundBoost?: boolean;
  defAbility?: { identifier: string; name: string; mult: number };
}

interface DefenseEffect {
  /** True when the ability grants full immunity to the move (damage = 0). */
  immune: boolean;
  /** Damage multiplier applied by the ability (< 1 = reduction, > 1 = amplification). Ignored when immune. */
  mult: number;
  identifier: string;
  name: string;
}

/**
 * Returns the most protective defensive ability effect for the given move against this target,
 * or null if none of the target's abilities affect it.
 *
 * Iterates all of the target's abilities and picks the one that best protects against the move
 * (immune beats any reduction; among reductions, the lowest multiplier wins). This is conservative:
 * if a Pokémon *could* have Thick Fat, we assume it does.
 */
function getTargetDefenseEffect(
  abilities: { identifier: string; name: string; isHidden: boolean }[],
  effectiveTypeId: number,
  effFactor: number,
  isPhysical: boolean,
  isContact: boolean,
  isSound: boolean,
): DefenseEffect | null {
  let best: DefenseEffect | null = null;

  const consider = (effect: DefenseEffect) => {
    if (!best) { best = effect; return; }
    if (effect.immune && !best.immune) { best = effect; return; }
    if (!effect.immune && !best.immune) {
      // For reductions (mult < 1) prefer the smallest mult.
      // For amplifications (mult > 1) only replace if also an amplification AND larger — we never
      // prefer an amplification over a reduction, so this only matters when both mult > 1.
      if (effect.mult < best.mult) best = effect;
    }
  };

  for (const ability of abilities) {
    const id = ability.identifier;
    let immune = false;
    let mult = 1.0;
    let relevant = false;

    switch (id) {
      // ── Type immunities ──────────────────────────────────────────────────
      case 'levitate':
      case 'earth-eater':
        if (effectiveTypeId === 5)  { immune = true; relevant = true; } break; // Ground
      case 'flash-fire':
      case 'well-baked-body':
        if (effectiveTypeId === 10) { immune = true; relevant = true; } break; // Fire
      case 'volt-absorb':
      case 'lightning-rod':
      case 'motor-drive':
        if (effectiveTypeId === 13) { immune = true; relevant = true; } break; // Electric
      case 'water-absorb':
      case 'storm-drain':
      case 'dry-skin':
        if (effectiveTypeId === 11) { immune = true; relevant = true; } break; // Water
      case 'sap-sipper':
        if (effectiveTypeId === 12) { immune = true; relevant = true; } break; // Grass

      // ── Damage reduction ─────────────────────────────────────────────────
      case 'thick-fat':
        // Halves Fire and Ice damage
        if (effectiveTypeId === 10 || effectiveTypeId === 15) { mult = 0.5; relevant = true; } break;
      case 'heatproof':
      case 'water-bubble':
        // Halves Fire damage
        if (effectiveTypeId === 10) { mult = 0.5; relevant = true; } break;
      case 'fluffy':
        // Fire moves deal ×2; non-fire contact deals ×0.5
        if (effectiveTypeId === 10) { mult = 2.0; relevant = true; }
        else if (isContact)         { mult = 0.5; relevant = true; } break;
      case 'filter':
      case 'solid-rock':
      case 'prism-armor':
        // Super-effective moves deal ×0.75
        if (effFactor > 100) { mult = 0.75; relevant = true; } break;
      case 'wonder-guard':
        // Only super-effective moves can hit at all
        if (effFactor <= 100) { immune = true; relevant = true; } break;
      case 'multiscale':
      case 'shadow-shield':
        // Halves damage at full HP — OHKO calcs always start from full HP
        mult = 0.5; relevant = true; break;
      case 'fur-coat':
        // Halves physical damage (equivalent to doubling Defense)
        if (isPhysical) { mult = 0.5; relevant = true; } break;
      case 'ice-scales':
        // Halves special damage
        if (!isPhysical) { mult = 0.5; relevant = true; } break;
      case 'punk-rock':
        // Halves incoming sound-based moves (target's Punk Rock)
        if (isSound) { mult = 0.5; relevant = true; } break;
    }

    if (relevant) consider({ immune, mult, identifier: id, name: ability.name });
  }

  return best;
}

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
  evStep = 4,
  maxAttackerEV = 252,
): OHKOAttempt | null {
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

  // Defensive ability on the target (Thick Fat, Multiscale, Wonder Guard, etc.)
  const defEffect = getTargetDefenseEffect(
    ts.pokemon.abilities, effectiveTypeId, effFactor, isPhysical, isContact, isSound,
  );
  if (defEffect?.immune) return null;
  const defAbilityMult = defEffect?.mult ?? 1.0;
  const defAbility = defEffect && defEffect.mult !== 1.0
    ? { identifier: defEffect.identifier, name: defEffect.name, mult: defEffect.mult }
    : undefined;

  // Psyshock/Psystrike/Secret Sword: Special moves that hit the target's Defense, not Sp. Def
  const isPsyshock = PSYSHOCK_MOVE_IDS.has(move.id);
  const rawDef = (isPhysical || isPsyshock) ? ts.def : ts.spd;
  const targetStageMult = (isPhysical || isPsyshock) ? stageMult(ts.defStage) : stageMult(ts.spdStage);
  const statMult = (isPhysical || isPsyshock) ? ts.defMult : ts.spdMult;
  // Screens: singles = ×0.5 damage (×2.0 defense), doubles = ×2/3 damage (×1.5 defense)
  // Screen type is based on move category (Psyshock is special → Light Screen applies)
  const screenDefMult = isDoubles ? 1.5 : 2.0;
  const screenMult = isPhysical ? (ts.reflect ? screenDefMult : 1.0) : (ts.lightScreen ? screenDefMult : 1.0);
  const defStat = Math.floor(rawDef * targetStageMult * statMult * screenMult);

  // Attacker stat stage — physical uses atkStage, special uses spaStage.
  // Foul Play uses the target's Attack, so attacker stages don't apply.
  // Body Press uses the attacker's Defense, so it uses atkDefStage instead.
  const atkStageMult = move.id === FOUL_PLAY_MOVE_ID ? 1.0
    : move.id === BODY_PRESS_MOVE_ID ? stageMult(atkDefStage)
    : stageMult(isPhysical ? atkStage : spaStage);

  // Choice item multiplier: Band boosts physical (not Foul Play / Body Press), Specs boosts special.
  // Body Press scales off Defense (not Attack), so Choice Band doesn't apply.
  // Foul Play uses the target's Attack (not attacker's), so Choice Band doesn't apply.
  const choiceItemMult = (isPhysical && move.id !== FOUL_PLAY_MOVE_ID && move.id !== BODY_PRESS_MOVE_ID)
    ? atkItemMult
    : (!isPhysical ? spaItemMult : 1.0);

  const atkTotalMult = atkStageMult * choiceItemMult;

  const stab = attackerTypeIds.includes(effectiveTypeId);
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
  const effectivePower = move.power * (abilityMod?.powerMult ?? 1.0) * weatherMult * terrainMult * fairyAuraMult * spreadMult * friendGuardMult * defAbilityMult;
  let activePower = effectivePower; // may be doubled for Round
  let needsRoundBoost = false;

  // Foul Play uses the target's Attack stat — the attacker invests no EVs
  const isFoulPlay = move.id === FOUL_PLAY_MOVE_ID;

  let evNeeded: number | null;
  let item: HeldItem | undefined;

  if (isFoulPlay) {
    // Foul Play uses the target's Attack including their active Attack stage
    const foulPlayAtk = Math.floor(ts.atk * stageMult(ts.atkStage));
    const { min, max } = damageSingle(effectivePower, foulPlayAtk, defStat, stabFactor, effFactor, 1.0);
    const lands = !showPossible ? min >= ts.hp : max >= ts.hp;
    if (!lands) return null;
    evNeeded = 0;
  } else {
    evNeeded = minEVsToOHKO(activePower, atkBase, defStat, ts.hp, stabFactor, effFactor, !showPossible, 1.0, atkTotalMult, evStep, maxAttackerEV);

    // Only fall back to a type-boosting item if no choice item is active — can't hold two items.
    if (evNeeded === null && choiceItemMult === 1.0) {
      const typeItem = TYPE_BOOST_ITEMS[effectiveTypeId];
      if (typeItem) {
        evNeeded = minEVsToOHKO(activePower, atkBase, defStat, ts.hp, stabFactor, effFactor, !showPossible, typeItem.boost, atkTotalMult, evStep, maxAttackerEV);
        if (evNeeded !== null) item = typeItem;
      }
    }

    // Round: if base power fails, retry at double power (another Pokémon used Round first).
    if (evNeeded === null && move.id === ROUND_MOVE_ID) {
      item = undefined;
      activePower = effectivePower * 2;
      evNeeded = minEVsToOHKO(activePower, atkBase, defStat, ts.hp, stabFactor, effFactor, !showPossible, 1.0, atkTotalMult, evStep, maxAttackerEV);
      if (evNeeded === null && choiceItemMult === 1.0) {
        const typeItem = TYPE_BOOST_ITEMS[effectiveTypeId];
        if (typeItem) {
          evNeeded = minEVsToOHKO(activePower, atkBase, defStat, ts.hp, stabFactor, effFactor, !showPossible, typeItem.boost, atkTotalMult, evStep, maxAttackerEV);
          if (evNeeded !== null) item = typeItem;
        }
      }
      if (evNeeded !== null) needsRoundBoost = true;
    }

    if (evNeeded === null) return null;
  }

  const atkStat = isFoulPlay ? ts.atk : Math.floor(calcStat(atkBase, evNeeded, 31, 50, 1.0) * atkTotalMult);
  const { min, max } = damageSingle(activePower, atkStat, defStat, stabFactor, effFactor, item?.boost ?? 1.0);

  return { evNeeded, item, stab, effFactor, minDmg: min, maxDmg: max, adjAccuracy, needsRoundBoost, defAbility };
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
  }));

  const results: PokemonOHKOResult[] = [];

  for (const [, attacker] of data.pokemon) {
    const moveIds = data.pokemonMoves.get(attacker.id);
    if (!moveIds) continue;

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

      // Build ability configs for a given weather (determines which weather-dependent abilities apply)
      const buildConfigs = (w: Weather): AbilityConfig[] => {
        const configs: AbilityConfig[] = [{ mod: null, ability: null }];
        for (const ability of attacker.abilities) {
          const m = getAbilityMod(ability.identifier, move, attacker.typeIds, isPhysical, w);
          if (m) configs.push({ mod: m, ability });
        }
        return configs;
      };

      // Find best attempt across a set of configs under a given weather
      const findBest = (configs: AbilityConfig[], w: Weather, ts: TargetStats) => {
        let best: { attempt: OHKOAttempt; ability: typeof attacker.abilities[0] | null } | null = null;
        for (const { mod, ability } of configs) {
          const attempt = tryOHKO(move, atkBase, attacker.typeIds, ts, data, showPossible, minAccuracy, mod, w, isDoubles, gravity, terrain, fairyAura, atkStage, spaStage, atkDefStage, atkItemMult, spaItemMult, evStep, maxAttackerEV);
          if (attempt && (!best || attempt.evNeeded < best.attempt.evNeeded)) {
            best = { attempt, ability };
          }
        }
        return best;
      };

      const noWeatherConfigs = buildConfigs('none');
      const withWeatherConfigs = weather !== 'none' ? buildConfigs(weather) : [];

      for (let ti = 0; ti < targetStats.length; ti++) {
        const ts = targetStats[ti];

        const noWeatherBest  = findBest(noWeatherConfigs, 'none', ts);
        const withWeatherBest = weather !== 'none' ? findBest(withWeatherConfigs, weather, ts) : null;

        // Preference order:
        //  1. Works without weather → use no-weather result (weather never required)
        //  2. Only works with weather → use with-weather result (weather required)
        //  3. Nothing works → skip

        let chosen: OHKOAttempt | null = null;
        let abilityRequired: OHKOMoveInfo['abilityMod'];
        let weatherRequired: OHKOMoveInfo['weatherRequired'];

        if (noWeatherBest) {
          // Achievable without weather — prefer this for displayed numbers if it has fewer/equal EVs
          // but if weather gives strictly fewer EVs, still use weather numbers (more accurate for current conditions)
          const useWeather = withWeatherBest &&
            withWeatherBest.attempt.evNeeded < noWeatherBest.attempt.evNeeded;
          chosen = useWeather ? withWeatherBest!.attempt : noWeatherBest.attempt;
          const src = useWeather ? withWeatherBest! : noWeatherBest;
          abilityRequired = src.ability
            ? { identifier: src.ability.identifier, name: src.ability.name, isHidden: src.ability.isHidden }
            : undefined;
          // weather was NOT required (works without it)
        } else if (withWeatherBest) {
          // Only achievable with weather
          chosen = withWeatherBest.attempt;
          abilityRequired = withWeatherBest.ability
            ? { identifier: withWeatherBest.ability.identifier, name: withWeatherBest.ability.name, isHidden: withWeatherBest.ability.isHidden }
            : undefined;
          weatherRequired = weather as Exclude<Weather, 'none'>;
        }

        if (!chosen) continue;

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
          weatherRequired,
          foulPlayAtk: move.id === FOUL_PLAY_MOVE_ID ? Math.floor(ts.atk * stageMult(ts.atkStage)) : undefined,
          needsRoundBoost: chosen.needsRoundBoost,
          defAbility: chosen.defAbility,
          coveredTargetIndices: [],
        });
      }
    }

    if (!movesPerTarget.every(moves => moves.length > 0)) continue;

    const moveTargetMap = new Map<number, number[]>();
    for (let ti = 0; ti < movesPerTarget.length; ti++) {
      for (const info of movesPerTarget[ti]) {
        if (!moveTargetMap.has(info.move.id)) moveTargetMap.set(info.move.id, []);
        moveTargetMap.get(info.move.id)!.push(ti);
      }
    }
    for (const moves of movesPerTarget) {
      for (const info of moves) {
        info.coveredTargetIndices = moveTargetMap.get(info.move.id)!;
      }
    }

    for (const moves of movesPerTarget) {
      moves.sort((a, b) => {
        if (a.isGuaranteed !== b.isGuaranteed) return a.isGuaranteed ? -1 : 1;
        return b.maxDamage - a.maxDamage;
      });
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
