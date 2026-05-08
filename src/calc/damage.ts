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
  defMult: number;      // multiplier on Def (e.g. 1.5 for Eviolite)
  spdMult: number;      // multiplier on SpD (e.g. 1.5 for Eviolite / Assault Vest)
  accuracyMult: number; // multiplier on move accuracy (e.g. 0.9 for Bright Powder)
  typeResists: { typeId: number; mult: number }[]; // berry type damage reductions
}

/** Defensive held items available on target Pokémon. */
export const TARGET_HELD_ITEMS: TargetHeldItem[] = [
  { name: 'Eviolite',      identifier: 'eviolite',      defMult: 1.5, spdMult: 1.5, accuracyMult: 1.0, typeResists: [] },
  { name: 'Assault Vest',  identifier: 'assault-vest',  defMult: 1.0, spdMult: 1.5, accuracyMult: 1.0, typeResists: [] },
  { name: 'Bright Powder', identifier: 'brightpowder',  defMult: 1.0, spdMult: 1.0, accuracyMult: 0.9, typeResists: [] },
  { name: 'Lax Incense',   identifier: 'lax-incense',   defMult: 1.0, spdMult: 1.0, accuracyMult: 0.9, typeResists: [] },
  // Type-resist berries — halve damage from the matching type
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
  identifier: string; // used to build sprite URL
  boost: number;      // damage multiplier, e.g. 1.2
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
  /** Held item required for this OHKO (only set when needed; absent = no item). */
  item?: HeldItem;
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

/** Type-boosting held items (+20%) keyed by type ID. */
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
  effFactor: number,
  itemMult = 1.0,
): { min: number; max: number } {
  const base = Math.floor(Math.floor(22 * power * atk / def) / 50) + 2;
  const afterStab = Math.floor(base * (stab ? 1.5 : 1.0));
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

/** Return the minimum EV investment (0, 4, 8 … 252) to OHKO, or null if impossible. */
function minEVsToOHKO(
  power: number,
  atkBase: number,
  def: number,
  targetHP: number,
  stab: boolean,
  effFactor: number,
  guaranteed: boolean,
  itemMult = 1.0,
): number | null {
  for (let ev = 0; ev <= 252; ev += 4) {
    const atk = calcStat(atkBase, ev, 31, 50, 1.0);
    const { min, max } = damageSingle(power, atk, def, stab, effFactor, itemMult);
    if (guaranteed ? min >= targetHP : max >= targetHP) return ev;
  }
  return null;
}

/**
 * For each Pokémon, find every move that OHKOs each target.
 * Only returns Pokémon that have at least one qualifying move for EVERY target.
 * When a move cannot OHKO unaided, the calc retries with a type-boosting item (+20%);
 * the item is included in OHKOMoveInfo only when required.
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
    defMult: t.heldItem?.defMult ?? 1.0,
    spdMult: t.heldItem?.spdMult ?? 1.0,
    accuracyMult: t.heldItem?.accuracyMult ?? 1.0,
    typeResists: t.heldItem?.typeResists ?? [],
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

      for (let ti = 0; ti < targetStats.length; ti++) {
        const ts = targetStats[ti];

        // Apply held-item defensive multiplier (Eviolite boosts both; AV boosts SpD only)
        const rawDef = isPhysical ? ts.def : ts.spd;
        const statMult = isPhysical ? ts.defMult : ts.spdMult;
        const defStat = Math.floor(rawDef * statMult);

        // Apply held-item accuracy reduction (Bright Powder, Lax Incense)
        // null accuracy = always hits, unaffected by accuracy items
        const moveAcc = move.accuracy;
        const adjAccuracy = moveAcc === null ? null : moveAcc * ts.accuracyMult;
        if (adjAccuracy !== null && adjAccuracy < minAccuracy) continue;

        let effFactor = getEffectiveness(move.typeId, ts.pokemon.typeIds, data.typeEfficacy);
        if (effFactor === 0) continue;

        // Apply type-resist berry (e.g. Occa Berry halves Fire damage)
        const berry = ts.typeResists.find(r => r.typeId === move.typeId);
        if (berry) effFactor = Math.floor(effFactor * berry.mult);

        // 1. Try without any item
        let evNeeded = minEVsToOHKO(move.power, atkBase, defStat, ts.hp, stab, effFactor, !showPossible);
        let heldItem: HeldItem | undefined;

        // 2. If impossible without item, try with the type-boosting item (+20%)
        if (evNeeded === null) {
          const typeItem = TYPE_BOOST_ITEMS[move.typeId];
          if (typeItem) {
            evNeeded = minEVsToOHKO(move.power, atkBase, defStat, ts.hp, stab, effFactor, !showPossible, typeItem.boost);
            if (evNeeded !== null) heldItem = typeItem;
          }
        }

        if (evNeeded === null) continue;

        const atkStat = calcStat(atkBase, evNeeded, 31, 50, 1.0);
        const { min, max } = damageSingle(move.power, atkStat, defStat, stab, effFactor, heldItem?.boost ?? 1.0);
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
          item: heldItem,
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
    for (const moves of movesPerTarget) {
      for (const info of moves) {
        info.coveredTargetIndices = moveTargetMap.get(info.move.id)!;
      }
    }

    // Sort each target's move list: guaranteed first, then by max damage desc
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
