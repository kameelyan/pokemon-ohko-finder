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
} from '../damage';

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
