import { describe, it, expect } from 'vitest';
import {
  statColor,
  getFormCategory,
  countActiveFilters,
  minSpeedEVs,
} from '../PokemonResultsView';
import { calcStat } from '../../calc/damage';
import type { MoveFlag } from '../../data/types';

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
  excludedFlags: new Set<MoveFlag>(),
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

  // ── Negative / edge cases ─────────────────────────────────────────────────

  it('targetSpeed=0 is beaten by any positive uninvested speed → returns 0', () => {
    // Any Pokémon with base speed ≥ 1 has uninvested speed > 0, beating target of 0
    expect(minSpeedEVs(50, 0, 1.0)).toBe(0);
  });

  it('natureMult=0 → stat is always 0, cannot outspeed any positive target → null', () => {
    // calcStat × 0 = 0; 0 is never > any positive targetSpeed
    expect(minSpeedEVs(100, 50, 0)).toBeNull();
  });

  it('natureMult=0 with targetSpeed ≤ 0 → 0 EVs (0 > negative target)', () => {
    // 0 > -1 is true, so first iteration returns 0 EVs
    expect(minSpeedEVs(100, -1, 0)).toBe(0);
  });

  it('result never exceeds maxEV cap', () => {
    // Even in a near-impossible case, result must be ≤ maxEV or null
    const result = minSpeedEVs(5, 90, 1.0);
    if (result !== null) expect(result).toBeLessThanOrEqual(252);
  });
});

// ─── countActiveFilters — all-active edge case ────────────────────────────────

describe('countActiveFilters — exhaustive combinations', () => {
  it('counts 0 for completely empty state', () => {
    const f = {
      types: new Set<number>(),
      minSpe: '', maxSpe: '',
      outspeed: 'any' as const,
      category: 'all' as const,
      noEvs: false, noItem: false, defaultOnly: false,
      excludedForms: new Set<'mega' | 'regional' | 'gmax' | 'other'>(),
      excludedFlags: new Set<MoveFlag>(),
    };
    expect(countActiveFilters(f, 0, false)).toBe(0);
  });

  it('counts all 12 possible active filters when everything is set', () => {
    const f = {
      types: new Set([10, 11]),     // +2
      minSpe: '80',                  // +1
      maxSpe: '150',                 // +1
      outspeed: 'all' as const,      // +1
      category: 'physical' as const, // +1
      noEvs: true,                   // +1
      noItem: true,                  // +1
      defaultOnly: true,             // +1
      excludedForms: new Set(['mega' as const]), // +1
      excludedFlags: new Set(['contact' as MoveFlag]), // +1
    };
    // types(2) + minSpe(1) + maxSpe(1) + outspeed(1) + category(1) + noEvs(1) + noItem(1)
    // + defaultOnly(1) + excludedForms(1) + excludedFlags(1) + showPossible(1) + minAccuracy(1) = 13
    expect(countActiveFilters(f, 80, true)).toBe(13);
  });

  it('minSpe empty string does not count, non-empty string does', () => {
    const base = { types: new Set<number>(), minSpe: '', maxSpe: '', outspeed: 'any' as const, category: 'all' as const, noEvs: false, noItem: false, defaultOnly: false, excludedForms: new Set<'mega' | 'regional' | 'gmax' | 'other'>(), excludedFlags: new Set<MoveFlag>() };
    expect(countActiveFilters({ ...base, minSpe: '' }, 0, false)).toBe(0);
    expect(countActiveFilters({ ...base, minSpe: '0' }, 0, false)).toBe(1);
    expect(countActiveFilters({ ...base, minSpe: '0', maxSpe: '999' }, 0, false)).toBe(2);
  });
});

// ─── getFormCategory — edge cases ────────────────────────────────────────────

describe('getFormCategory — edge cases', () => {
  it('empty string identifier (non-default) → "other"', () => {
    expect(getFormCategory('', false)).toBe('other');
  });

  it('identifier with no known suffix → "other"', () => {
    expect(getFormCategory('castform-snowy', false)).toBe('other');
    expect(getFormCategory('wormadam-plant', false)).toBe('other');
  });

  it('mega takes priority over other suffixes if both present', () => {
    // pathological — real identifiers never have both, but the function checks in order
    expect(getFormCategory('something-mega-alola', false)).toBe('mega');
  });

  it('default=true always returns null regardless of identifier', () => {
    expect(getFormCategory('', true)).toBeNull();
    expect(getFormCategory('pikachu-original', true)).toBeNull();
    expect(getFormCategory('charizard-mega', true)).toBeNull();
  });
});
