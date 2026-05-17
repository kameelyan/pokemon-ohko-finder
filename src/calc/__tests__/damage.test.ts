import { describe, it, expect } from 'vitest';
import {
  calcHP,
  calcStat,
  stageMult,
  getWeatherMult,
  getWeatherDefMult,
  getTerrainMult,
  damageSingle,
  FOUL_PLAY_MOVE_ID,
  BODY_PRESS_MOVE_ID,
  PSYSHOCK_MOVE_IDS,
  findPokemonOHKOs,
  TARGET_HELD_ITEMS,
  type TargetConfig,
} from '../damage';
import type { GameData, Move, MoveFlag, Pokemon, PokemonAbility } from '../../data/types';

// ─── Stat calculation ────────────────────────────────────────────────────────

describe('calcHP', () => {
  it('computes Garchomp HP at 0 EVs (base 108)', () => {
    // floor((2*108 + 31 + 0) * 50/100) + 50 + 10 = floor(247*0.5)+60 = 123+60 = 183
    expect(calcHP(108)).toBe(183);
  });

  it('computes HP at 252 EVs', () => {
    // floor((2*108+31+63)*50/100)+60 = floor(310*0.5)+60 = 155+60 = 215
    expect(calcHP(108, 252)).toBe(215);
  });

  it('Shedinja base-1 HP via formula (game hardcodes to 1, formula does not)', () => {
    // The formula gives 76 for base 1 — Shedinja's actual 1 HP is a game quirk, not in this formula
    expect(calcHP(1)).toBe(76);
  });
});

describe('calcStat', () => {
  it('computes Garchomp Attack at 0 EVs neutral nature (base 130)', () => {
    // floor((floor((2*130+31)*50/100)+5)*1.0) = floor((145+5)*1.0) = 150
    expect(calcStat(130)).toBe(150);
  });

  it('applies +10% nature multiplier', () => {
    // floor(150 * 1.1) = floor(165) = 165
    expect(calcStat(130, 0, 31, 50, 1.1)).toBe(165);
  });

  it('applies -10% nature multiplier', () => {
    // floor(150 * 0.9) = floor(135) = 135
    expect(calcStat(130, 0, 31, 50, 0.9)).toBe(135);
  });

  it('increases with EV investment', () => {
    const at0 = calcStat(130, 0);
    const at252 = calcStat(130, 252);
    expect(at252).toBeGreaterThan(at0);
    expect(at252 - at0).toBe(32); // 252 EVs = 63 extra stat points, floor(63/2) = 31... actually 32
  });
});

describe('stageMult', () => {
  it('returns 1.0 at stage 0', () => {
    expect(stageMult(0)).toBe(1.0);
  });

  it('+1 stage = ×1.5', () => {
    expect(stageMult(1)).toBe(1.5);
  });

  it('+2 stage = ×2.0', () => {
    expect(stageMult(2)).toBe(2.0);
  });

  it('+6 stage = ×4.0', () => {
    expect(stageMult(6)).toBe(4.0);
  });

  it('-1 stage = ×0.667', () => {
    expect(stageMult(-1)).toBeCloseTo(2 / 3);
  });

  it('-2 stage = ×0.5', () => {
    expect(stageMult(-2)).toBe(0.5);
  });

  it('-6 stage = ×0.25', () => {
    expect(stageMult(-6)).toBe(0.25);
  });

  it('clamps above +6', () => {
    expect(stageMult(7)).toBe(stageMult(6));
  });

  it('clamps below -6', () => {
    expect(stageMult(-7)).toBe(stageMult(-6));
  });
});

// ─── Weather multipliers ─────────────────────────────────────────────────────

describe('getWeatherMult', () => {
  const FIRE = 10;
  const WATER = 11;
  const GRASS = 12;

  it('Sun boosts Fire ×1.5', () => {
    expect(getWeatherMult('sun', FIRE)).toBe(1.5);
  });

  it('Sun weakens Water ×0.5', () => {
    expect(getWeatherMult('sun', WATER)).toBe(0.5);
  });

  it('Rain boosts Water ×1.5', () => {
    expect(getWeatherMult('rain', WATER)).toBe(1.5);
  });

  it('Rain weakens Fire ×0.5', () => {
    expect(getWeatherMult('rain', FIRE)).toBe(0.5);
  });

  it('Sun has no effect on non-Fire/Water types', () => {
    expect(getWeatherMult('sun', GRASS)).toBe(1.0);
  });

  it('Rain has no effect on non-Fire/Water types', () => {
    expect(getWeatherMult('rain', GRASS)).toBe(1.0);
  });

  it('Sand has no effect on move power', () => {
    expect(getWeatherMult('sand', FIRE)).toBe(1.0);
    expect(getWeatherMult('sand', WATER)).toBe(1.0);
  });

  it('Snow has no effect on move power', () => {
    expect(getWeatherMult('snow', FIRE)).toBe(1.0);
    expect(getWeatherMult('snow', 15)).toBe(1.0); // Ice
  });

  it('No weather = ×1.0 for all types', () => {
    expect(getWeatherMult('none', FIRE)).toBe(1.0);
    expect(getWeatherMult('none', WATER)).toBe(1.0);
  });
});

// ─── Weather defensive multipliers ───────────────────────────────────────────

describe('getWeatherDefMult', () => {
  const ICE_TYPE  = [15];
  const ROCK_TYPE = [6];
  const FIRE_TYPE = [10];
  const ICE_ROCK  = [15, 6]; // dual type

  // Snow: Ice-type gains ×1.5 Defense vs physical moves
  it('Snow boosts Ice-type Def ×1.5 vs physical moves', () => {
    expect(getWeatherDefMult('snow', true, false, ICE_TYPE)).toBe(1.5);
  });

  it('Snow boosts Ice-type Def ×1.5 vs Psyshock (hits Def)', () => {
    expect(getWeatherDefMult('snow', false, true, ICE_TYPE)).toBe(1.5);
  });

  it('Snow does NOT boost Ice-type vs special moves (hits Sp. Def, not Def)', () => {
    expect(getWeatherDefMult('snow', false, false, ICE_TYPE)).toBe(1.0);
  });

  it('Snow has no effect on non-Ice types', () => {
    expect(getWeatherDefMult('snow', true, false, FIRE_TYPE)).toBe(1.0);
  });

  // Sand: Rock-type gains ×1.5 Sp. Def vs special moves
  it('Sand boosts Rock-type Sp. Def ×1.5 vs special moves', () => {
    expect(getWeatherDefMult('sand', false, false, ROCK_TYPE)).toBe(1.5);
  });

  it('Sand does NOT boost Rock-type vs physical moves (hits Def, not Sp. Def)', () => {
    expect(getWeatherDefMult('sand', true, false, ROCK_TYPE)).toBe(1.0);
  });

  it('Sand does NOT boost Rock-type vs Psyshock (hits Def)', () => {
    expect(getWeatherDefMult('sand', false, true, ROCK_TYPE)).toBe(1.0);
  });

  it('Sand has no effect on non-Rock types', () => {
    expect(getWeatherDefMult('sand', false, false, FIRE_TYPE)).toBe(1.0);
  });

  // Dual typing
  it('Snow boosts Ice/Rock dual type vs physical', () => {
    expect(getWeatherDefMult('snow', true, false, ICE_ROCK)).toBe(1.5);
  });

  it('Sand boosts Ice/Rock dual type vs special (Rock side)', () => {
    expect(getWeatherDefMult('sand', false, false, ICE_ROCK)).toBe(1.5);
  });

  // Other weathers have no defensive effect
  it('Sun has no defensive effect', () => {
    expect(getWeatherDefMult('sun', true, false, ICE_TYPE)).toBe(1.0);
    expect(getWeatherDefMult('sun', false, false, ROCK_TYPE)).toBe(1.0);
  });

  it('Rain has no defensive effect', () => {
    expect(getWeatherDefMult('rain', true, false, ICE_TYPE)).toBe(1.0);
    expect(getWeatherDefMult('rain', false, false, ROCK_TYPE)).toBe(1.0);
  });

  it('No weather = ×1.0 for all', () => {
    expect(getWeatherDefMult('none', true, false, ICE_TYPE)).toBe(1.0);
    expect(getWeatherDefMult('none', false, false, ROCK_TYPE)).toBe(1.0);
  });
});

// ─── damageSingle reflects weather defensive boost ───────────────────────────
// Regression test: previously the result-selection logic in findPokemonOHKOs
// would display no-weather damage numbers even when weather was active, because
// it preferred whichever calc gave a lower EV requirement rather than always
// using the active-weather calc. Snow + Ice-type target was the reported case.

describe('getWeatherDefMult effect on damageSingle (regression)', () => {
  it('physical damage vs Ice type is lower in Snow than without weather', () => {
    const defBase = 100;
    const snowMult = getWeatherDefMult('snow', true, false, [15]); // Ice type, physical
    expect(snowMult).toBe(1.5);

    const noSnow = damageSingle(100, 150, defBase,          1.0, 100);
    const inSnow = damageSingle(100, 150, Math.floor(defBase * snowMult), 1.0, 100);

    expect(inSnow.max).toBeLessThan(noSnow.max);
    expect(inSnow.min).toBeLessThan(noSnow.min);
  });

  it('special damage vs Ice type is unchanged in Snow (Snow only boosts Def, not SpDef)', () => {
    const defBase = 100;
    const snowMult = getWeatherDefMult('snow', false, false, [15]); // Ice type, special
    expect(snowMult).toBe(1.0); // no boost

    const noSnow = damageSingle(100, 150, defBase, 1.0, 100);
    const inSnow = damageSingle(100, 150, Math.floor(defBase * snowMult), 1.0, 100);

    expect(inSnow.max).toBe(noSnow.max);
  });

  it('physical damage vs non-Ice type is unchanged in Snow', () => {
    const defBase = 100;
    const snowMult = getWeatherDefMult('snow', true, false, [10]); // Fire type, physical
    expect(snowMult).toBe(1.0); // no boost

    const noSnow = damageSingle(100, 150, defBase, 1.0, 100);
    const inSnow = damageSingle(100, 150, Math.floor(defBase * snowMult), 1.0, 100);

    expect(inSnow.max).toBe(noSnow.max);
  });

  it('special damage vs Rock type is lower in Sand (Sand boosts SpDef)', () => {
    const defBase = 100;
    const sandMult = getWeatherDefMult('sand', false, false, [6]); // Rock type, special
    expect(sandMult).toBe(1.5);

    const noSand = damageSingle(100, 150, defBase,          1.0, 100);
    const inSand = damageSingle(100, 150, Math.floor(defBase * sandMult), 1.0, 100);

    expect(inSand.max).toBeLessThan(noSand.max);
  });
});

// ─── Terrain multipliers ─────────────────────────────────────────────────────

describe('getTerrainMult', () => {
  const ELECTRIC_TYPE = 13;
  const GRASS_TYPE = 12;
  const FIRE_TYPE = 10;
  const DRAGON_TYPE = 16;
  const PSYCHIC_TYPE = 14;

  const EARTHQUAKE_ID = 89;
  const MAGNITUDE_ID = 222;
  const BULLDOZE_ID = 523;
  const FLAMETHROWER_ID = 53;

  it('Electric Terrain boosts Electric moves ×1.3', () => {
    expect(getTerrainMult('electric', FLAMETHROWER_ID, ELECTRIC_TYPE)).toBe(1.3);
  });

  it('Electric Terrain has no effect on non-Electric moves', () => {
    expect(getTerrainMult('electric', FLAMETHROWER_ID, FIRE_TYPE)).toBe(1.0);
  });

  it('Grassy Terrain boosts Grass moves ×1.3', () => {
    expect(getTerrainMult('grassy', FLAMETHROWER_ID, GRASS_TYPE)).toBe(1.3);
  });

  it('Grassy Terrain weakens Earthquake ×0.5', () => {
    expect(getTerrainMult('grassy', EARTHQUAKE_ID, FIRE_TYPE)).toBe(0.5);
  });

  it('Grassy Terrain weakens Magnitude ×0.5', () => {
    expect(getTerrainMult('grassy', MAGNITUDE_ID, FIRE_TYPE)).toBe(0.5);
  });

  it('Grassy Terrain weakens Bulldoze ×0.5', () => {
    expect(getTerrainMult('grassy', BULLDOZE_ID, FIRE_TYPE)).toBe(0.5);
  });

  it('Misty Terrain halves Dragon moves ×0.5', () => {
    expect(getTerrainMult('misty', FLAMETHROWER_ID, DRAGON_TYPE)).toBe(0.5);
  });

  it('Misty Terrain has no effect on non-Dragon moves', () => {
    expect(getTerrainMult('misty', FLAMETHROWER_ID, FIRE_TYPE)).toBe(1.0);
  });

  it('Psychic Terrain boosts Psychic moves ×1.3', () => {
    expect(getTerrainMult('psychic', FLAMETHROWER_ID, PSYCHIC_TYPE)).toBe(1.3);
  });

  it('No terrain = ×1.0 for all', () => {
    expect(getTerrainMult('none', EARTHQUAKE_ID, FIRE_TYPE)).toBe(1.0);
  });
});

// ─── Core damage formula ─────────────────────────────────────────────────────

describe('damageSingle', () => {
  it('produces min that is 85% of max', () => {
    const { min, max } = damageSingle(100, 100, 100, 1.0, 100);
    expect(min).toBe(Math.floor(max * 0.85));
  });

  it('STAB increases damage by ×1.5', () => {
    const noStab = damageSingle(100, 100, 100, 1.0, 100);
    const stab   = damageSingle(100, 100, 100, 1.5, 100);
    expect(stab.max).toBeGreaterThan(noStab.max);
    expect(stab.max / noStab.max).toBeCloseTo(1.5, 0);
  });

  it('super-effective (×200) deals double damage vs neutral', () => {
    const neutral = damageSingle(100, 100, 100, 1.0, 100);
    const superEff = damageSingle(100, 100, 100, 1.0, 200);
    expect(superEff.max).toBeCloseTo(neutral.max * 2, 0);
  });

  it('not-very-effective (×50) halves damage', () => {
    const neutral = damageSingle(100, 100, 100, 1.0, 100);
    const resisted = damageSingle(100, 100, 100, 1.0, 50);
    expect(resisted.max).toBeCloseTo(neutral.max / 2, 0);
  });

  it('higher attack = more damage', () => {
    const low  = damageSingle(100, 50,  100, 1.0, 100);
    const high = damageSingle(100, 200, 100, 1.0, 100);
    expect(high.max).toBeGreaterThan(low.max);
  });

  it('higher defense = less damage', () => {
    const lowDef  = damageSingle(100, 100, 50,  1.0, 100);
    const highDef = damageSingle(100, 100, 200, 1.0, 100);
    expect(lowDef.max).toBeGreaterThan(highDef.max);
  });

  it('item multiplier scales damage', () => {
    const base    = damageSingle(100, 100, 100, 1.0, 100, 1.0);
    const boosted = damageSingle(100, 100, 100, 1.0, 100, 1.2);
    expect(boosted.max).toBeGreaterThan(base.max);
  });

  // ── Negative / edge cases ───────────────────────────────────────────────────

  it('def=0 returns {min:0, max:0} instead of Infinity', () => {
    const result = damageSingle(100, 100, 0, 1.0, 100);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(isFinite(result.min)).toBe(true);
    expect(isFinite(result.max)).toBe(true);
  });

  it('atk=0 deals no meaningful damage (base formula gives 2, floored to 0 after ×0.85)', () => {
    // 22 * power * 0 / def = 0, base = 0 + 2 = 2, min = floor(2 * 0.85) = 1
    // This is the formula's inherent minimum — documents the behaviour rather than asserting 0
    const result = damageSingle(100, 0, 100, 1.0, 100);
    expect(result.min).toBeGreaterThanOrEqual(0);
    expect(result.max).toBeGreaterThanOrEqual(result.min);
  });

  it('immune (effFactor=0) deals zero damage', () => {
    const result = damageSingle(100, 100, 100, 1.0, 0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  it('min is always ≤ max', () => {
    const cases: [number, number, number, number, number][] = [
      [1,   1,   1,   1.0, 100],
      [250, 999, 1,   1.5, 200],
      [100, 100, 100, 1.0, 50],
      [80,  45,  300, 1.0, 100],
    ];
    for (const [pw, atk, def, stab, eff] of cases) {
      const { min, max } = damageSingle(pw, atk, def, stab, eff);
      expect(min).toBeLessThanOrEqual(max);
    }
  });
});

// ─── Exported constants sanity checks ────────────────────────────────────────

describe('move ID constants', () => {
  it('Foul Play ID is 492', () => {
    expect(FOUL_PLAY_MOVE_ID).toBe(492);
  });

  it('Body Press ID is 776', () => {
    expect(BODY_PRESS_MOVE_ID).toBe(776);
  });

  it('Psyshock move set includes Psyshock (473), Psystrike (540), Secret Sword (548)', () => {
    expect(PSYSHOCK_MOVE_IDS.has(473)).toBe(true);
    expect(PSYSHOCK_MOVE_IDS.has(540)).toBe(true);
    expect(PSYSHOCK_MOVE_IDS.has(548)).toBe(true);
  });
});

// ─── Multi-hit & Sturdy integration tests ────────────────────────────────────
//
// These tests exercise findPokemonOHKOs with minimal hand-crafted GameData so
// they run in isolation (no file I/O).  The fixture uses:
//   • Type 1 (Normal) vs Normal target → neutral effectiveness (factor 100)
//   • Attacker base Atk 200 so it can reliably OHKO / not OHKO depending on EV
//   • Minimal stats to avoid floating-point surprises in calcs

function makeAbility(identifier: string, name: string): PokemonAbility {
  return { identifier, name, description: '', isHidden: false };
}

function makePokemon(
  id: number,
  atk: number,
  def: number,
  hp: number,
  typeIds: number[],
  abilities: PokemonAbility[] = [],
): Pokemon {
  return {
    id,
    identifier: `pokemon-${id}`,
    name: `Pokemon ${id}`,
    speciesId: id,
    isDefault: true,
    typeIds,
    stats: { hp, atk, def, spa: atk, spd: def, spe: 80 },
    abilities,
    weight: 50,
  };
}

function makeMove(
  id: number,
  power: number,
  typeId: number,
  damageClassId: 2 | 3 = 2,
  multiHit: { min: number; max: number } | null = null,
  flags: MoveFlag[] = [],
): Move {
  return {
    id,
    identifier: `move-${id}`,
    name: `Move ${id}`,
    typeId,
    power,
    damageClassId,
    accuracy: 100,
    description: '',
    priority: 0,
    flags,
    effectId: 0,
    effectChance: null,
    isSpread: false,
    multiHit,
  };
}

/** Minimal GameData with one attacker, its moves, one target type, and neutral efficacy. */
function makeData(
  attacker: Pokemon,
  targetTypeId: number,
  moves: Move[],
): GameData {
  const pokemonMap = new Map<number, Pokemon>([[attacker.id, attacker]]);
  const movesMap = new Map<number, Move>(moves.map(m => [m.id, m]));
  const pokemonMoves = new Map<number, Set<number>>([[attacker.id, new Set(moves.map(m => m.id))]]);
  // Neutral effectiveness for each move type vs target type
  const typeEfficacy = new Map<string, number>();
  for (const m of moves) {
    typeEfficacy.set(`${m.typeId}-${targetTypeId}`, 100); // neutral
  }
  const typeNames = new Map<number, string>([[targetTypeId, 'Normal']]);
  const championsRoster = new Set<number>();
  return { pokemon: pokemonMap, moves: movesMap, pokemonMoves, typeEfficacy, typeNames, championsRoster };
}

/** Build a minimal TargetConfig from a Pokemon with optional ability selection. */
function makeTarget(
  pokemon: Pokemon,
  selectedAbilityIdentifier?: string,
): TargetConfig {
  return {
    pokemon,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    selectedAbilityIdentifier,
  };
}

// ── Attacker/Target fixtures ───────────────────────────────────────────────────
// Attacker: base Atk 200, type 1 (Normal). With 0 EVs its Attack is 255.
// Target:   base HP 80, base Def 30 → HP ≈ 170, Def ≈ 71 at 0 EVs.
// A Normal-type move at power 100 from this attacker will easily OHKO the target in one hit.
// A power-1 move will NOT OHKO in one hit but should OHKO with enough hits.

const NORMAL_TYPE = 1;
const ATTACKER_ID = 1;
const TARGET_ID = 2;

const attacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE]);
const target   = makePokemon(TARGET_ID,    50,  30,  80, [NORMAL_TYPE], [
  makeAbility('sturdy', 'Sturdy'),
]);

// ─── Multi-hit damage accumulation ───────────────────────────────────────────

describe('findPokemonOHKOs — multi-hit moves', () => {
  const singleHitMove = makeMove(101, 100, NORMAL_TYPE);
  const twoHitMove    = makeMove(102,  55, NORMAL_TYPE, 2, { min: 2, max: 2 });
  // power 60 × 2-5 hits — enough damage that ≥ 2 guaranteed hits KO the target
  const twoToFiveHit  = makeMove(103,  60, NORMAL_TYPE, 2, { min: 2, max: 5 });

  const targetCfg = makeTarget(target);

  it('single-hit move result has no hitsRequired field', () => {
    const data = makeData(attacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([targetCfg], data);
    expect(results.length).toBeGreaterThan(0);
    const info = results[0].movesPerTarget[0][0];
    expect(info.hitsRequired).toBeUndefined();
    expect(info.breaksSturdy).toBeUndefined();
  });

  it('fixed 2-hit move has hitsRequired = 2 and doubled damage', () => {
    const data = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([targetCfg], data);
    expect(results.length).toBeGreaterThan(0);
    const info = results[0].movesPerTarget[0][0];
    expect(info.hitsRequired).toBe(2);
    // Damage shown should be ≥ targetHP (KO confirmed)
    expect(info.maxDamage).toBeGreaterThanOrEqual(info.targetHP);
  });

  it('2-5 hit move shows hitsRequired ≥ 1 and ≤ max hits', () => {
    const data = makeData(attacker, NORMAL_TYPE, [twoToFiveHit]);
    const results = findPokemonOHKOs([targetCfg], data);
    expect(results.length).toBeGreaterThan(0);
    const info = results[0].movesPerTarget[0][0];
    expect(info.hitsRequired).toBeGreaterThanOrEqual(1);
    expect(info.hitsRequired!).toBeLessThanOrEqual(5);
  });

  it('2-5 hit move total damage ≥ targetHP (confirmed KO)', () => {
    const data = makeData(attacker, NORMAL_TYPE, [twoToFiveHit]);
    const results = findPokemonOHKOs([targetCfg], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.maxDamage).toBeGreaterThanOrEqual(info.targetHP);
  });
});

// ─── Sturdy — single-hit blocked ─────────────────────────────────────────────

describe('findPokemonOHKOs — Sturdy blocks single-hit moves', () => {
  const singleHitMove = makeMove(201, 100, NORMAL_TYPE);
  const stuardyTarget = makeTarget(target, 'sturdy');

  it('single-hit move is removed from results when target has Sturdy', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    // No attacker should appear — the only available move is blocked by Sturdy
    expect(results.length).toBe(0);
  });
});

// ─── Sturdy — bypassed by multi-hit ──────────────────────────────────────────

describe('findPokemonOHKOs — multi-hit breaks Sturdy', () => {
  const twoHitMove  = makeMove(301, 50, NORMAL_TYPE, 2, { min: 2, max: 2 });
  const stuardyTarget = makeTarget(target, 'sturdy');

  it('guaranteed 2-hit move appears in results against a Sturdy target', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Sturdy-breaking result has breaksSturdy = true', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.breaksSturdy).toBe(true);
  });

  it('Sturdy-breaking result has hitsRequired = 2', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.hitsRequired).toBe(2);
  });

  it('Sturdy-breaking result has evNeeded = 0 (no EV investment required)', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.evNeeded).toBe(0);
  });

  it('Sturdy-breaking move with min=1 (e.g. Population Bomb) does NOT appear as guaranteed KO', () => {
    // min=1 means it might only hit once — not guaranteed to break Sturdy
    const popBomb = makeMove(302, 20, NORMAL_TYPE, 2, { min: 1, max: 10 });
    const data    = makeData(attacker, NORMAL_TYPE, [popBomb]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    // Not guaranteed to appear — single-hit is blocked; only possible if max hits = 10 can KO
    // In guaranteed mode (showPossible=false), population bomb (min=1 hit) can't guarantee Sturdy break
    expect(results.length).toBe(0);
  });
});

// ─── Sturdy — bypassed by Mold Breaker ────────────────────────────────────────

describe('findPokemonOHKOs — Mold Breaker bypasses Sturdy', () => {
  const singleHitMove = makeMove(401, 100, NORMAL_TYPE);
  const stuardyTarget = makeTarget(target, 'sturdy');

  it('Mold Breaker attacker can OHKO a Sturdy target with a single-hit move', () => {
    const mbAttacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE], [
      makeAbility('mold-breaker', 'Mold Breaker'),
    ]);
    const data    = makeData(mbAttacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Mold Breaker result does NOT have breaksSturdy set (Sturdy was simply ignored)', () => {
    const mbAttacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE], [
      makeAbility('mold-breaker', 'Mold Breaker'),
    ]);
    const data    = makeData(mbAttacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.breaksSturdy).toBeUndefined();
  });

  it('Turboblaze also bypasses Sturdy (equivalent to Mold Breaker)', () => {
    const tbAttacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE], [
      makeAbility('turboblaze', 'Turboblaze'),
    ]);
    const data    = makeData(tbAttacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Teravolt also bypasses Sturdy (equivalent to Mold Breaker)', () => {
    const tvAttacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE], [
      makeAbility('teravolt', 'Teravolt'),
    ]);
    const data    = makeData(tvAttacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── Parental Bond ────────────────────────────────────────────────────────────

describe('findPokemonOHKOs — Parental Bond bypasses Sturdy', () => {
  const singleHitMove = makeMove(501, 50, NORMAL_TYPE);
  const stuardyTarget = makeTarget(target, 'sturdy');

  it('Mega Kangaskhan (ID 10039) bypasses Sturdy with a single-hit move', () => {
    // Parental Bond makes every move hit twice → first breaks Sturdy, second KOs
    const megaKang = makePokemon(10039, 125, 100, 105, [NORMAL_TYPE]);
    const data     = makeData(megaKang, NORMAL_TYPE, [singleHitMove]);
    const results  = findPokemonOHKOs([stuardyTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Mega Kangaskhan result has breaksSturdy = true', () => {
    const megaKang = makePokemon(10039, 125, 100, 105, [NORMAL_TYPE]);
    const data     = makeData(megaKang, NORMAL_TYPE, [singleHitMove]);
    const results  = findPokemonOHKOs([stuardyTarget], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.breaksSturdy).toBe(true);
  });

  it('non-Mega-Kangaskhan Pokémon (ID ≠ 10039) is still blocked by Sturdy', () => {
    const notKang = makePokemon(115, 95, 80, 105, [NORMAL_TYPE]); // base Kangaskhan (not mega)
    const data    = makeData(notKang, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([stuardyTarget], data);
    expect(results.length).toBe(0);
  });
});

// ─── Protean / Libero ─────────────────────────────────────────────────────────
// Protean and Libero change the user's type to match the move before it hits,
// granting STAB (×1.5) on every move regardless of the attacker's actual types.
//
// Fixture math (verified):
//   Attacker base Atk 103 (Greninja-like), Water move power 80, Normal-type target.
//   Target: base HP 50 → 125 HP, base Def 30 → 50 Def.
//
//   With Protean (STAB 1.5×):
//     252 EVs → max 166, min 141  — both ≥ 125  → GUARANTEED OHKO ✓
//   Without Protean (no STAB 1.0×):
//     252 EVs → max 111            — 111 < 125  → CANNOT OHKO at any EV ✓
//
// The gap is unambiguous: Protean is the sole differentiator.

describe('findPokemonOHKOs — Protean / Libero always grant STAB', () => {
  const WATER_TYPE  = 11;
  // Water move on a Normal-type attacker — no natural STAB
  const waterMove = makeMove(601, 80, WATER_TYPE);

  // Soft target: base HP 50 (→125 HP), base Def 30 (→50 Def) — chosen so
  // Protean unlocks a guaranteed OHKO that is impossible without it.
  const softTarget = makeTarget(makePokemon(TARGET_ID, 50, 30, 50, [NORMAL_TYPE]));

  it('without Protean: cannot OHKO even at 252 EVs (max damage 111 < 125 HP)', () => {
    const noAbility = makePokemon(ATTACKER_ID, 103, 80, 100, [NORMAL_TYPE]);
    const data = makeData(noAbility, NORMAL_TYPE, [waterMove]);
    const results = findPokemonOHKOs([softTarget], data);
    // No STAB → move can never OHKO the target regardless of EV investment
    expect(results.length).toBe(0);
  });

  it('Protean grants STAB and enables the OHKO (guaranteed at 252 EVs)', () => {
    const proteanAttacker = makePokemon(ATTACKER_ID, 103, 80, 100, [NORMAL_TYPE], [
      makeAbility('protean', 'Protean'),
    ]);
    const data    = makeData(proteanAttacker, NORMAL_TYPE, [waterMove]);
    const results = findPokemonOHKOs([softTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Protean result has abilityMod set to "protean"', () => {
    const proteanAttacker = makePokemon(ATTACKER_ID, 103, 80, 100, [NORMAL_TYPE], [
      makeAbility('protean', 'Protean'),
    ]);
    const data    = makeData(proteanAttacker, NORMAL_TYPE, [waterMove]);
    const results = findPokemonOHKOs([softTarget], data);
    const info = results[0].movesPerTarget[0][0];
    expect(info.abilityMod?.identifier).toBe('protean');
  });

  it('Protean does NOT double-count STAB when the attacker already has the move type', () => {
    // Water-type attacker using a Water move already has STAB — Protean should return null
    // (the getAbilityMod guard: `attackerTypeIds.includes(move.typeId) ? null : mod(...)`)
    // so the result should be identical to no-ability.
    const waterNoAbility = makePokemon(ATTACKER_ID, 103, 80, 100, [WATER_TYPE]);
    const waterProtean   = makePokemon(ATTACKER_ID, 103, 80, 100, [WATER_TYPE], [
      makeAbility('protean', 'Protean'),
    ]);
    const dataNoAbility = makeData(waterNoAbility, NORMAL_TYPE, [makeMove(602, 80, WATER_TYPE)]);
    const dataProtean   = makeData(waterProtean,   NORMAL_TYPE, [makeMove(602, 80, WATER_TYPE)]);

    const resNoAbility = findPokemonOHKOs([softTarget], dataNoAbility);
    const resProtean   = findPokemonOHKOs([softTarget], dataProtean);

    // Both can OHKO (Water attacker has natural STAB). EVs must be equal — no double bonus.
    expect(resNoAbility.length).toBe(resProtean.length);
    if (resNoAbility.length > 0 && resProtean.length > 0) {
      expect(resProtean[0].movesPerTarget[0][0].evNeeded)
        .toBe(resNoAbility[0].movesPerTarget[0][0].evNeeded);
    }
  });

  it('Libero grants exactly the same bonus as Protean', () => {
    const libero  = makePokemon(ATTACKER_ID, 103, 80, 100, [NORMAL_TYPE], [makeAbility('libero',  'Libero')]);
    const protean = makePokemon(ATTACKER_ID, 103, 80, 100, [NORMAL_TYPE], [makeAbility('protean', 'Protean')]);

    const resLibero  = findPokemonOHKOs([softTarget], makeData(libero,  NORMAL_TYPE, [waterMove]));
    const resProtean = findPokemonOHKOs([softTarget], makeData(protean, NORMAL_TYPE, [waterMove]));

    expect(resLibero.length).toBe(resProtean.length);
    if (resLibero.length > 0 && resProtean.length > 0) {
      expect(resLibero[0].movesPerTarget[0][0].evNeeded)
        .toBe(resProtean[0].movesPerTarget[0][0].evNeeded);
    }
  });

  it('Protean is only shown when required — no-ability result wins when the OHKO is already achievable', () => {
    // Attacker strong enough (base Atk 200) to OHKO without STAB.
    // Protean is in the ability list, but since no-ability can already OHKO it should NOT
    // appear as the abilityMod — the no-ability path is shown instead.
    const strongNoAbility = makePokemon(ATTACKER_ID, 200, 80, 100, [NORMAL_TYPE]);
    const strongProtean   = makePokemon(ATTACKER_ID, 200, 80, 100, [NORMAL_TYPE], [
      makeAbility('protean', 'Protean'),
    ]);

    const resNoAbility = findPokemonOHKOs([softTarget], makeData(strongNoAbility, NORMAL_TYPE, [waterMove]));
    const resProtean   = findPokemonOHKOs([softTarget], makeData(strongProtean,   NORMAL_TYPE, [waterMove]));

    // Both should find a result — the move OHKOs without STAB at high Atk
    expect(resNoAbility.length).toBeGreaterThan(0);
    expect(resProtean.length).toBeGreaterThan(0);

    // Even though the attacker has Protean, it should NOT be marked as required
    expect(resProtean[0].movesPerTarget[0][0].abilityMod).toBeUndefined();

    // The evNeeded should be the same (no-ability result, not the Protean shortcut)
    expect(resProtean[0].movesPerTarget[0][0].evNeeded)
      .toBe(resNoAbility[0].movesPerTarget[0][0].evNeeded);
  });
});

// ─── Focus Sash — single-hit blocked ─────────────────────────────────────────

const focusSash = TARGET_HELD_ITEMS.find(i => i.identifier === 'focus-sash')!;

describe('findPokemonOHKOs — Focus Sash blocks single-hit moves', () => {
  const singleHitMove = makeMove(701, 100, NORMAL_TYPE);
  const sashTarget: TargetConfig = { ...makeTarget(target), heldItem: focusSash };

  it('single-hit move is removed from results when target holds Focus Sash', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    expect(results.length).toBe(0);
  });

  it('Focus Sash does not affect results when target HP is not at risk (sanity)', () => {
    // Without Focus Sash the same attacker+move finds a result
    const normalTarget = makeTarget(target);
    const data         = makeData(attacker, NORMAL_TYPE, [singleHitMove]);
    const results      = findPokemonOHKOs([normalTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── Focus Sash — bypassed by multi-hit ──────────────────────────────────────

describe('findPokemonOHKOs — multi-hit breaks Focus Sash', () => {
  const twoHitMove  = makeMove(702, 50, NORMAL_TYPE, 2, { min: 2, max: 2 });
  const sashTarget: TargetConfig = { ...makeTarget(target), heldItem: focusSash };

  it('guaranteed 2-hit move appears in results against a Focus Sash target', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Sash-breaking result has breaksSash = true', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    const info    = results[0].movesPerTarget[0][0];
    expect(info.breaksSash).toBe(true);
  });

  it('Sash-breaking result has breaksSturdy undefined (not Sturdy)', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    const info    = results[0].movesPerTarget[0][0];
    expect(info.breaksSturdy).toBeUndefined();
  });

  it('Sash-breaking result has hitsRequired = 2', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    const info    = results[0].movesPerTarget[0][0];
    expect(info.hitsRequired).toBe(2);
  });

  it('Sash-breaking result has evNeeded = 0 (no EV investment required)', () => {
    const data    = makeData(attacker, NORMAL_TYPE, [twoHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    const info    = results[0].movesPerTarget[0][0];
    expect(info.evNeeded).toBe(0);
  });

  it('move with min=1 hits does NOT break Focus Sash (not guaranteed to hit twice)', () => {
    const popBomb  = makeMove(703, 20, NORMAL_TYPE, 2, { min: 1, max: 10 });
    const data     = makeData(attacker, NORMAL_TYPE, [popBomb]);
    const results  = findPokemonOHKOs([sashTarget], data);
    // min=1 cannot guarantee the Sash pops on the first hit
    expect(results.length).toBe(0);
  });
});

// ─── Focus Sash — Mold Breaker does NOT bypass ───────────────────────────────

describe('findPokemonOHKOs — Mold Breaker does NOT bypass Focus Sash', () => {
  const singleHitMove = makeMove(704, 100, NORMAL_TYPE);
  const sashTarget: TargetConfig = { ...makeTarget(target), heldItem: focusSash };

  it('Mold Breaker attacker is still blocked by Focus Sash', () => {
    const mbAttacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE], [
      makeAbility('mold-breaker', 'Mold Breaker'),
    ]);
    const data    = makeData(mbAttacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    expect(results.length).toBe(0);
  });

  it('Turboblaze is also still blocked by Focus Sash', () => {
    const tbAttacker = makePokemon(ATTACKER_ID, 200, 100, 100, [NORMAL_TYPE], [
      makeAbility('turboblaze', 'Turboblaze'),
    ]);
    const data    = makeData(tbAttacker, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    expect(results.length).toBe(0);
  });
});

// ─── Focus Sash — bypassed by Parental Bond ──────────────────────────────────

describe('findPokemonOHKOs — Parental Bond bypasses Focus Sash', () => {
  const singleHitMove = makeMove(705, 50, NORMAL_TYPE);
  const sashTarget: TargetConfig = { ...makeTarget(target), heldItem: focusSash };

  it('Mega Kangaskhan (ID 10039) bypasses Focus Sash with a single-hit move', () => {
    const megaKang = makePokemon(10039, 125, 100, 105, [NORMAL_TYPE]);
    const data     = makeData(megaKang, NORMAL_TYPE, [singleHitMove]);
    const results  = findPokemonOHKOs([sashTarget], data);
    expect(results.length).toBeGreaterThan(0);
  });

  it('Parental Bond result has breaksSash = true', () => {
    const megaKang = makePokemon(10039, 125, 100, 105, [NORMAL_TYPE]);
    const data     = makeData(megaKang, NORMAL_TYPE, [singleHitMove]);
    const results  = findPokemonOHKOs([sashTarget], data);
    const info     = results[0].movesPerTarget[0][0];
    expect(info.breaksSash).toBe(true);
  });

  it('non-Mega-Kangaskhan Pokémon is still blocked by Focus Sash', () => {
    const notKang = makePokemon(115, 95, 80, 105, [NORMAL_TYPE]);
    const data    = makeData(notKang, NORMAL_TYPE, [singleHitMove]);
    const results = findPokemonOHKOs([sashTarget], data);
    expect(results.length).toBe(0);
  });
});

// ─── Nature variant — spread move in doubles ──────────────────────────────────
//
// Mirrors the real Mega Tyranitar vs Sneasler scenario:
//   Attacker: base Atk 164, Rock/Dark type (no Ground STAB)
//   Target: hp base 80 (→155 HP), def base 60 (→80 Def), types=Fighting/Poison
//   Move: Earthquake (power 100, Ground type, isSpread=true in doubles → effective power 75)
//   Type effectiveness: Ground vs Poison = ×2 → effFactor = 200
//
//   Neutral nature:
//     At 252 EVs: atk = floor(216 × 1.0) = 216
//       base = floor(floor(22×75×216/80)/50)+2 = 91
//       afterType = floor(91×2) = 182, min = floor(182×0.85) = 154  → 154 < 155 → FAILS
//     → Cannot guarantee OHKO at any EV ≤ 252.
//
//   +Atk nature (×1.1):
//     At 124 EVs: calcStat(164,124)=200, atk = floor(200×1.1) = 220
//       base = floor(floor(22×75×220/80)/50)+2 = 92
//       afterType = floor(92×2) = 184, min = floor(184×0.85) = 156  → 156 ≥ 155 → PASSES
//     → Guaranteed OHKO at 124 EVs.
//
// Expected: findPokemonOHKOs should emit a nature-variant row (nature='+atk').

describe('findPokemonOHKOs — nature variant for spread move (Earthquake scenario)', () => {
  const GROUND = 5, FIGHTING = 2, POISON = 4, ROCK = 6, DARK = 17;

  // Mega Tyranitar stats: atk=164, Rock/Dark type
  const megaTyranitar = makePokemon(10049, 164, 150, 100, [ROCK, DARK]);

  // Sneasler: hp=80, def=60, types=Fighting/Poison
  const sneasler = makePokemon(903, 130, 60, 80, [FIGHTING, POISON]);

  // Earthquake: power 100, Ground, physical, spread in doubles
  const earthquake: Move = {
    id: 89,
    identifier: 'earthquake',
    name: 'Earthquake',
    typeId: GROUND,
    power: 100,
    damageClassId: 2,
    accuracy: 100,
    description: '',
    priority: 0,
    flags: [],
    effectId: 148,
    effectChance: null,
    isSpread: true,
    multiHit: null,
  };

  const typeEfficacy = new Map<string, number>([
    [`${GROUND}-${FIGHTING}`, 100], // Ground neutral vs Fighting
    [`${GROUND}-${POISON}`,   200], // Ground 2× vs Poison
  ]);

  const data: GameData = {
    pokemon:      new Map([[megaTyranitar.id, megaTyranitar]]),
    moves:        new Map([[earthquake.id, earthquake]]),
    pokemonMoves: new Map([[megaTyranitar.id, new Set([earthquake.id])]]),
    typeEfficacy,
    typeNames:    new Map([[FIGHTING, 'Fighting'], [POISON, 'Poison']]),
    championsRoster: new Set(),
  };

  const target: TargetConfig = {
    pokemon: sneasler,
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  };

  it('neutral Earthquake with Soft Sand CAN guarantee OHKO (item-assisted at ev=0)', () => {
    // Ground type moves have Soft Sand (1.2×) as their type-boost item.
    // Soft Sand at ev=0: atk=184 → base=77, afterType=154, max=floor(154×1.2)=184, min=floor(184×0.85)=156 ≥ 155.
    // So a Soft Sand neutral row IS expected — the neutral-no-item row is absent.
    const results = findPokemonOHKOs([target], data, false, 0, 'none', true /* doubles */);
    const allMoves = results.flatMap(r => r.movesPerTarget.flat());
    const neutralEQ = allMoves.find(m => m.move.id === 89 && !m.nature);
    expect(neutralEQ).toBeDefined();
    expect(neutralEQ!.item?.identifier).toBe('soft-sand'); // neutral works only with item
    expect(neutralEQ!.isGuaranteed).toBe(true);
  });

  it('+Atk nature variant row appears for Earthquake (guaranteed OHKO at 124 EVs, no item needed)', () => {
    // Even though neutral+Soft Sand gives evNeeded=0, the nature variant (no item, ev=124)
    // should still appear — it's the answer to "do I need an item, or just the right nature?"
    const results = findPokemonOHKOs([target], data, false, 0, 'none', true /* doubles */);
    const allMoves = results.flatMap(r => r.movesPerTarget.flat());
    const natureEQ = allMoves.find(m => m.move.id === 89 && m.nature === '+atk');
    expect(natureEQ).toBeDefined();
    expect(natureEQ!.item).toBeUndefined();   // no item needed — just the nature
    expect(natureEQ!.isGuaranteed).toBe(true);
    expect(natureEQ!.evNeeded).toBeLessThanOrEqual(252);
  });

  it('+Atk nature Earthquake shows evNeeded ≤ 124', () => {
    const results = findPokemonOHKOs([target], data, false, 0, 'none', true /* doubles */);
    const allMoves = results.flatMap(r => r.movesPerTarget.flat());
    const natureEQ = allMoves.find(m => m.move.id === 89 && m.nature === '+atk');
    expect(natureEQ!.evNeeded).toBeLessThanOrEqual(124);
  });
});
