import type { GameData, Move, Pokemon } from '../data/types';

export interface EVSpread {
  hp: number;
  def: number;
  spd: number;
}

export interface TargetConfig {
  pokemon: Pokemon;
  evs: EVSpread;
  heldItem?: TargetHeldItem;
}

export interface TargetHeldItem {
  name: string;
  identifier: string;
  defMult: number;
  spdMult: number;
  accuracyMult: number;
  typeResists: { typeId: number; mult: number }[];
}

/** Defensive held items available on target Pokémon. */
export const TARGET_HELD_ITEMS: TargetHeldItem[] = [
  { name: 'Eviolite',      identifier: 'eviolite',      defMult: 1.5, spdMult: 1.5, accuracyMult: 1.0, typeResists: [] },
  { name: 'Assault Vest',  identifier: 'assault-vest',  defMult: 1.0, spdMult: 1.5, accuracyMult: 1.0, typeResists: [] },
  { name: 'Bright Powder', identifier: 'brightpowder',  defMult: 1.0, spdMult: 1.0, accuracyMult: 0.9, typeResists: [] },
  { name: 'Lax Incense',   identifier: 'lax-incense',   defMult: 1.0, spdMult: 1.0, accuracyMult: 0.9, typeResists: [] },
  { name: 'Chilan Berry',  identifier: 'chilan-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 1,  mult: 0.5 }] },
  { name: 'Chople Berry',  identifier: 'chople-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 2,  mult: 0.5 }] },
  { name: 'Coba Berry',    identifier: 'coba-berry',    defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 3,  mult: 0.5 }] },
  { name: 'Kebia Berry',   identifier: 'kebia-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 4,  mult: 0.5 }] },
  { name: 'Shuca Berry',   identifier: 'shuca-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 5,  mult: 0.5 }] },
  { name: 'Charti Berry',  identifier: 'charti-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 6,  mult: 0.5 }] },
  { name: 'Tanga Berry',   identifier: 'tanga-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 7,  mult: 0.5 }] },
  { name: 'Kasib Berry',   identifier: 'kasib-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 8,  mult: 0.5 }] },
  { name: 'Babiri Berry',  identifier: 'babiri-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 9,  mult: 0.5 }] },
  { name: 'Occa Berry',    identifier: 'occa-berry',    defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 10, mult: 0.5 }] },
  { name: 'Passho Berry',  identifier: 'passho-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 11, mult: 0.5 }] },
  { name: 'Rindo Berry',   identifier: 'rindo-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 12, mult: 0.5 }] },
  { name: 'Wacan Berry',   identifier: 'wacan-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 13, mult: 0.5 }] },
  { name: 'Payapa Berry',  identifier: 'payapa-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 14, mult: 0.5 }] },
  { name: 'Yache Berry',   identifier: 'yache-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 15, mult: 0.5 }] },
  { name: 'Haban Berry',   identifier: 'haban-berry',   defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 16, mult: 0.5 }] },
  { name: 'Colbur Berry',  identifier: 'colbur-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 17, mult: 0.5 }] },
  { name: 'Roseli Berry',  identifier: 'roseli-berry',  defMult: 1.0, spdMult: 1.0, accuracyMult: 1.0, typeResists: [{ typeId: 18, mult: 0.5 }] },
];

export interface HeldItem {
  name: string;
  identifier: string;
  boost: number;
}

/** Active weather condition. Affects damage for certain move types and some abilities. */
export type Weather = 'none' | 'sun' | 'rain' | 'sand' | 'snow';

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
      return (move.effectChance !== null && move.effectChance > 0) ? mod(1.3) : null;

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
): number | null {
  for (let ev = 0; ev <= 252; ev += 4) {
    const atk = calcStat(atkBase, ev, 31, 50, 1.0);
    const { min, max } = damageSingle(power, atk, def, stabFactor, effFactor, itemMult);
    if (guaranteed ? min >= targetHP : max >= targetHP) return ev;
  }
  return null;
}

interface TargetStats {
  pokemon: Pokemon;
  hp: number;
  def: number;
  spd: number;
  defMult: number;
  spdMult: number;
  accuracyMult: number;
  typeResists: { typeId: number; mult: number }[];
}

interface OHKOAttempt {
  evNeeded: number;
  item?: HeldItem;
  stab: boolean;
  effFactor: number;
  minDmg: number;
  maxDmg: number;
  adjAccuracy: number | null;
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
): OHKOAttempt | null {
  const effectiveTypeId = abilityMod?.typeOverride ?? move.typeId;

  const moveAcc = move.accuracy;
  const adjAccuracy = moveAcc === null
    ? null
    : moveAcc * ts.accuracyMult * (abilityMod?.accMult ?? 1.0);
  if (adjAccuracy !== null && adjAccuracy < minAccuracy) return null;

  let effFactor = getEffectiveness(effectiveTypeId, ts.pokemon.typeIds, data.typeEfficacy);
  if (effFactor === 0) return null;

  const berry = ts.typeResists.find(r => r.typeId === effectiveTypeId);
  if (berry) effFactor = Math.floor(effFactor * berry.mult);

  const isPhysical = move.damageClassId === 2;
  const rawDef = isPhysical ? ts.def : ts.spd;
  const statMult = isPhysical ? ts.defMult : ts.spdMult;
  const defStat = Math.floor(rawDef * statMult);

  const stab = attackerTypeIds.includes(effectiveTypeId);
  const stabFactor = stab ? (abilityMod?.stabMult ?? 1.5) : 1.0;

  // Weather multiplies the effective power (after ability)
  const weatherMult = getWeatherMult(weather, effectiveTypeId);
  const effectivePower = move.power * (abilityMod?.powerMult ?? 1.0) * weatherMult;

  let evNeeded = minEVsToOHKO(effectivePower, atkBase, defStat, ts.hp, stabFactor, effFactor, !showPossible);
  let item: HeldItem | undefined;

  if (evNeeded === null) {
    const typeItem = TYPE_BOOST_ITEMS[effectiveTypeId];
    if (typeItem) {
      evNeeded = minEVsToOHKO(effectivePower, atkBase, defStat, ts.hp, stabFactor, effFactor, !showPossible, typeItem.boost);
      if (evNeeded !== null) item = typeItem;
    }
  }

  if (evNeeded === null) return null;

  const atkStat = calcStat(atkBase, evNeeded, 31, 50, 1.0);
  const { min, max } = damageSingle(effectivePower, atkStat, defStat, stabFactor, effFactor, item?.boost ?? 1.0);

  return { evNeeded, item, stab, effFactor, minDmg: min, maxDmg: max, adjAccuracy };
}

export function findPokemonOHKOs(
  targets: TargetConfig[],
  data: GameData,
  showPossible = false,
  minAccuracy = 0,
  weather: Weather = 'none',
): PokemonOHKOResult[] {
  if (targets.length === 0) return [];

  const targetStats: TargetStats[] = targets.map(t => ({
    pokemon: t.pokemon,
    hp: calcHP(t.pokemon.stats.hp, t.evs.hp),
    def: calcStat(t.pokemon.stats.def, t.evs.def),
    spd: calcStat(t.pokemon.stats.spd, t.evs.spd),
    defMult: t.heldItem?.defMult ?? 1.0,
    spdMult: t.heldItem?.spdMult ?? 1.0,
    accuracyMult: t.heldItem?.accuracyMult ?? 1.0,
    typeResists: t.heldItem?.typeResists ?? [],
  }));

  const results: PokemonOHKOResult[] = [];

  for (const [, attacker] of data.pokemon) {
    const moveIds = data.pokemonMoves.get(attacker.id);
    if (!moveIds) continue;

    const movesPerTarget: OHKOMoveInfo[][] = targets.map(() => []);

    for (const moveId of moveIds) {
      const move = data.moves.get(moveId);
      if (!move) continue;

      const isPhysical = move.damageClassId === 2;
      const atkBase = isPhysical ? attacker.stats.atk : attacker.stats.spa;

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
          const attempt = tryOHKO(move, atkBase, attacker.typeIds, ts, data, showPossible, minAccuracy, mod, w);
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
