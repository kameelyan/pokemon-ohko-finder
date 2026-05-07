import type { GameData, Move, Pokemon } from '../data/types';

export interface EVSpread {
  hp: number;
  def: number;
  spd: number;
}

export interface TargetConfig {
  pokemon: Pokemon;
  evs: EVSpread;
}

export interface OHKOMoveInfo {
  move: Move;
  minDamage: number;
  maxDamage: number;
  targetHP: number;
  isGuaranteed: boolean;
  typeEffectiveness: number; // multiplier (e.g. 2)
  stab: boolean;
  accuracy: number | null; // null = always hits
  evNeeded: number; // minimum Atk/SpA EVs (0–252) to achieve this OHKO
  /** Indices of every target (within the targets array) that this move can OHKO. */
  coveredTargetIndices: number[];
}

export interface PokemonOHKOResult {
  pokemon: Pokemon;
  /** One array of OHKO moves per target, in the same order as the targets input. */
  movesPerTarget: OHKOMoveInfo[][];
  /** True when every target has at least one guaranteed OHKO move. */
  allGuaranteed: boolean;
}

/** Gen 4+ HP formula */
export function calcHP(base: number, ev = 0, iv = 31, level = 50): number {
  return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
}

/** Gen 4+ other stat formula */
export function calcStat(base: number, ev = 0, iv = 31, level = 50, nature = 1.0): number {
  return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * nature);
}

function damageSingle(
  power: number,
  atk: number,
  def: number,
  stab: boolean,
  effFactor: number
): { min: number; max: number } {
  const base = Math.floor(Math.floor(22 * power * atk / def) / 50) + 2;
  const maxDmg = Math.floor(Math.floor(base * (stab ? 1.5 : 1.0)) * (effFactor / 100));
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

/** Return the minimum EV investment (0, 4, 8 … 252) to OHKO, or null if impossible. */
function minEVsToOHKO(
  power: number,
  atkBase: number,
  def: number,
  targetHP: number,
  stab: boolean,
  effFactor: number,
  guaranteed: boolean
): number | null {
  for (let ev = 0; ev <= 252; ev += 4) {
    const atk = calcStat(atkBase, ev, 31, 50, 1.0);
    const { min, max } = damageSingle(power, atk, def, stab, effFactor);
    if (guaranteed ? min >= targetHP : max >= targetHP) return ev;
  }
  return null;
}

/**
 * For each Pokémon, find every move that OHKOs each target.
 * Only returns Pokémon that have at least one qualifying move for EVERY target.
 */
export function findPokemonOHKOs(
  targets: TargetConfig[],
  data: GameData,
  showPossible = false,
  minAccuracy = 0
): PokemonOHKOResult[] {
  if (targets.length === 0) return [];

  // Pre-compute target defensive stats
  const targetStats = targets.map(t => ({
    pokemon: t.pokemon,
    hp: calcHP(t.pokemon.stats.hp, t.evs.hp),
    def: calcStat(t.pokemon.stats.def, t.evs.def),
    spd: calcStat(t.pokemon.stats.spd, t.evs.spd),
  }));

  const results: PokemonOHKOResult[] = [];

  for (const [, attacker] of data.pokemon) {
    const moveIds = data.pokemonMoves.get(attacker.id);
    if (!moveIds) continue;

    // Build OHKO move lists per target
    const movesPerTarget: OHKOMoveInfo[][] = targets.map(() => []);

    for (const moveId of moveIds) {
      const move = data.moves.get(moveId);
      if (!move) continue;

      const isPhysical = move.damageClassId === 2;

      // Accuracy filter: null accuracy = always hits, treat as passing any threshold
      const effectiveAccuracy = move.accuracy ?? 101;
      if (effectiveAccuracy < minAccuracy) continue;

      const atkBase = isPhysical ? attacker.stats.atk : attacker.stats.spa;
      const stab = attacker.typeIds.includes(move.typeId);

      // Check this move against each target independently
      for (let ti = 0; ti < targetStats.length; ti++) {
        const ts = targetStats[ti];
        const defStat = isPhysical ? ts.def : ts.spd;
        const effFactor = getEffectiveness(move.typeId, ts.pokemon.typeIds, data.typeEfficacy);
        if (effFactor === 0) continue;

        // Find minimum EVs needed rather than always assuming 252
        const evNeeded = minEVsToOHKO(move.power, atkBase, defStat, ts.hp, stab, effFactor, !showPossible);
        if (evNeeded === null) continue;

        const atkStat = calcStat(atkBase, evNeeded, 31, 50, 1.0);
        const { min, max } = damageSingle(move.power, atkStat, defStat, stab, effFactor);
        const isGuaranteed = min >= ts.hp;

        movesPerTarget[ti].push({
          move,
          minDamage: min,
          maxDamage: max,
          targetHP: ts.hp,
          isGuaranteed,
          typeEffectiveness: effFactor / 100,
          stab,
          accuracy: move.accuracy,
          evNeeded,
          coveredTargetIndices: [], // filled in below
        });
      }
    }

    // Only include if every target has at least one qualifying move
    const coversAllTargets = movesPerTarget.every(moves => moves.length > 0);
    if (!coversAllTargets) continue;

    // Build move → covered target indices map
    const moveTargetMap = new Map<number, number[]>();
    for (let ti = 0; ti < movesPerTarget.length; ti++) {
      for (const info of movesPerTarget[ti]) {
        if (!moveTargetMap.has(info.move.id)) moveTargetMap.set(info.move.id, []);
        moveTargetMap.get(info.move.id)!.push(ti);
      }
    }
    // Stamp each entry with the full coverage list
    for (const moves of movesPerTarget) {
      for (const info of moves) {
        info.coveredTargetIndices = moveTargetMap.get(info.move.id)!;
      }
    }

    // Sort each target's move list: guaranteed first, then by max damage
    for (const moves of movesPerTarget) {
      moves.sort((a, b) => {
        if (a.isGuaranteed !== b.isGuaranteed) return a.isGuaranteed ? -1 : 1;
        return b.maxDamage - a.maxDamage;
      });
    }

    const allGuaranteed = movesPerTarget.every(moves => moves.some(m => m.isGuaranteed));

    results.push({ pokemon: attacker, movesPerTarget, allGuaranteed });
  }

  // Sort: all-guaranteed first, then by BST descending
  const bst = (p: Pokemon) =>
    p.stats.hp + p.stats.atk + p.stats.def + p.stats.spa + p.stats.spd + p.stats.spe;

  results.sort((a, b) => {
    if (a.allGuaranteed !== b.allGuaranteed) return a.allGuaranteed ? -1 : 1;
    return bst(b.pokemon) - bst(a.pokemon);
  });

  return results;
}
