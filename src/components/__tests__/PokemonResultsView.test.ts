import { describe, it, expect } from 'vitest';
import {
  statColor,
  getFormCategory,
  countActiveFilters,
  minSpeedEVs,
} from '../PokemonResultsView';
import { calcStat } from '../../calc/damage';

// ─── statColor ────────────────────────────────────────────────────────────────

describe('statColor', () => {
  it('returns green for stats ≥ 120', () => {
    expect(statColor(120)).toBe('#68d391');
    expect(statColor(150)).toBe('#68d391');
    expect(statColor(255)).toBe('#68d391');
  });

  it('returns yellow for stats 90–119', () => {
    expect(statColor(90)).toBe('#f6e05e');
    expect(statColor(100)).toBe('#f6e05e');
    expect(statColor(119)).toBe('#f6e05e');
  });

  it('returns orange for stats 60–89', () => {
    expect(statColor(60)).toBe('#f6ad55');
    expect(statColor(75)).toBe('#f6ad55');
    expect(statColor(89)).toBe('#f6ad55');
  });

  it('returns red for stats below 60', () => {
    expect(statColor(59)).toBe('#fc8181');
    expect(statColor(1)).toBe('#fc8181');
    expect(statColor(0)).toBe('#fc8181');
  });
});

// ─── getFormCategory ──────────────────────────────────────────────────────────

describe('getFormCategory', () => {
  it('returns null for default forms', () => {
    expect(getFormCategory('garchomp', true)).toBeNull();
    expect(getFormCategory('garchomp-mega', true)).toBeNull();
  });

  it('classifies Mega Evolutions', () => {
    expect(getFormCategory('garchomp-mega', false)).toBe('mega');
    expect(getFormCategory('kyogre-primal', false)).toBe('mega');
  });

  it('classifies regional variants', () => {
    expect(getFormCategory('raichu-alola', false)).toBe('regional');
    expect(getFormCategory('corsola-galar', false)).toBe('regional');
    expect(getFormCategory('typhlosion-hisui', false)).toBe('regional');
    expect(getFormCategory('tauros-paldea', false)).toBe('regional');
  });

  it('classifies Gigantamax forms', () => {
    expect(getFormCategory('charizard-gmax', false)).toBe('gmax');
    expect(getFormCategory('pikachu-gmax', false)).toBe('gmax');
  });

  it('classifies other alternate forms', () => {
    expect(getFormCategory('rotom-wash', false)).toBe('other');
    expect(getFormCategory('shaymin-sky', false)).toBe('other');
    expect(getFormCategory('garchomp-f', false)).toBe('other');
  });
});

// ─── countActiveFilters ───────────────────────────────────────────────────────

const emptyFilters = {
  types: new Set<number>(),
  minSpe: '',
  maxSpe: '',
  outspeed: 'any' as const,
  category: 'all' as const,
  noEvs: false,
  noItem: false,
  defaultOnly: false,
  excludedForms: new Set<'mega' | 'regional' | 'gmax' | 'other'>(),
  excludedFlags: new Set<string>(),
};

describe('countActiveFilters', () => {
  it('returns 0 when nothing is active', () => {
    expect(countActiveFilters(emptyFilters, 0, false)).toBe(0);
  });

  it('counts type filters', () => {
    const f = { ...emptyFilters, types: new Set([10, 11]) };
    expect(countActiveFilters(f, 0, false)).toBe(2);
  });

  it('counts minSpe / maxSpe as 1 each when non-empty', () => {
    const f = { ...emptyFilters, minSpe: '100', maxSpe: '150' };
    expect(countActiveFilters(f, 0, false)).toBe(2);
  });

  it('counts non-default outspeed filter', () => {
    const f = { ...emptyFilters, outspeed: 'all' as const };
    expect(countActiveFilters(f, 0, false)).toBe(1);
  });

  it('counts non-default category filter', () => {
    const f = { ...emptyFilters, category: 'physical' as const };
    expect(countActiveFilters(f, 0, false)).toBe(1);
  });

  it('counts boolean flags', () => {
    const f = { ...emptyFilters, noEvs: true, noItem: true, defaultOnly: true };
    expect(countActiveFilters(f, 0, false)).toBe(3);
  });

  it('counts showPossible and minAccuracy', () => {
    expect(countActiveFilters(emptyFilters, 50, true)).toBe(2);
  });

  it('counts excludedForms when non-empty', () => {
    const f = { ...emptyFilters, excludedForms: new Set(['mega' as const]) };
    expect(countActiveFilters(f, 0, false)).toBe(1);
  });

  it('accumulates all active filters correctly', () => {
    const f = {
      ...emptyFilters,
      types: new Set([10]),
      noEvs: true,
      category: 'special' as const,
    };
    // types(1) + noEvs(1) + category(1) + minAccuracy(1)
    expect(countActiveFilters(f, 75, false)).toBe(4);
  });
});

// ─── minSpeedEVs ─────────────────────────────────────────────────────────────

describe('minSpeedEVs', () => {
  it('returns 0 when uninvested speed already outspeeds target', () => {
    // Garchomp base 102 at L50 uninvested = floor((2*102+31)*50/100)+5 = floor(235*0.5)+5 = 122
    // Target of 100 is already beaten
    expect(minSpeedEVs(102, 100, 1.0)).toBe(0);
  });

  it('returns the minimum EVs needed to outspeed, and that value actually works', () => {
    // base 50 uninvested speed = floor((2*50+31)*0.5)+5 = 70. Target 80 requires EVs.
    const result = minSpeedEVs(50, 80, 1.0);
    expect(result).not.toBeNull();
    expect(result).toBeGreaterThan(0);
    expect(result! % 4).toBe(0);
    // Verify the returned EV count genuinely outspeeds the target
    expect(Math.floor(calcStat(50, result!, 31, 50, 1.0))).toBeGreaterThan(80);
    // And one step below does not
    if (result! > 0) {
      expect(Math.floor(calcStat(50, result! - 4, 31, 50, 1.0))).toBeLessThanOrEqual(80);
    }
  });

  it('returns null when even 252 EVs cannot outspeed', () => {
    // Base 1 Pokémon vs target speed of 999 — impossible
    expect(minSpeedEVs(1, 999, 1.0)).toBeNull();
  });

  it('positive nature multiplier requires fewer EVs', () => {
    const neutral = minSpeedEVs(80, 120, 1.0);
    const positive = minSpeedEVs(80, 120, 1.1);
    // Both should succeed; positive nature needs ≤ EVs
    if (neutral !== null && positive !== null) {
      expect(positive).toBeLessThanOrEqual(neutral);
    }
  });

  it('Choice Scarf (×1.5 stage mult) drastically reduces EV requirement', () => {
    const noScarf = minSpeedEVs(80, 150, 1.0, 1.0);
    const scarf   = minSpeedEVs(80, 150, 1.0, 1.5);
    if (scarf !== null && noScarf !== null) {
      expect(scarf).toBeLessThan(noScarf);
    } else {
      // scarf should succeed where no scarf may fail
      expect(scarf).not.toBeNull();
    }
  });

  it('returns EVs as multiples of the step (default 4)', () => {
    const result = minSpeedEVs(70, 110, 1.0);
    if (result !== null) expect(result % 4).toBe(0);
  });
});
