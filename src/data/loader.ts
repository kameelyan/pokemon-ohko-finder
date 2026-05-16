// Data is served relative to the app base path (import.meta.env.BASE_URL).
import type { GameData, Move, MoveFlag, Pokemon, PokemonAbility } from './types';

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = (values[i] ?? '').trim();
    });
    return obj;
  });
}

async function fetchCSV(path: string): Promise<Record<string, string>[]> {
  const res = await fetch(path);
  const text = await res.text();
  return parseCSV(text);
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  return res.json() as Promise<T>;
}

/** "charizard-mega-x" + base "charizard" → "Mega X" */
function formatFormSuffix(identifier: string, speciesIdentifier: string): string {
  const suffix = identifier.startsWith(speciesIdentifier + '-')
    ? identifier.slice(speciesIdentifier.length + 1)
    : identifier;
  return suffix.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export async function loadGameData(): Promise<GameData> {
  const base = import.meta.env.BASE_URL;
  const [
    pokemonRows,
    speciesNameRows,
    statsRows,
    typesRows,
    movesRows,
    moveNamesRows,
    pokemonMovesRows,
    typeEfficacyRows,
    typeNameRows,
    moveDescriptions,
    formsRows,
    formNamesRows,
    pokemonAbilitiesJson,
    championsRosterJson,
    moveFlagsJson,
  ] = await Promise.all([
    fetchCSV(`${base}data/pokemon.csv`),
    fetchCSV(`${base}data/pokemon_species_names.csv`),
    fetchCSV(`${base}data/pokemon_stats.csv`),
    fetchCSV(`${base}data/pokemon_types.csv`),
    fetchCSV(`${base}data/moves.csv`),
    fetchCSV(`${base}data/move_names.csv`),
    fetchCSV(`${base}data/pokemon_moves.csv`),
    fetchCSV(`${base}data/type_efficacy.csv`),
    fetchCSV(`${base}data/types.csv`),
    fetchJSON<Record<string, string>>(`${base}data/move_descriptions.json`),
    fetchCSV(`${base}data/pokemon_forms.csv`),
    fetchCSV(`${base}data/pokemon_form_names.csv`),
    fetchJSON<Record<string, PokemonAbility[]>>(`${base}data/pokemon_abilities.json`),
    fetchJSON<number[]>(`${base}data/champions_roster.json`),
    fetchJSON<Record<string, MoveFlag[]>>(`${base}data/move_flags.json`),
  ]);

  // English species names (language_id = 9)
  const speciesNames = new Map<number, string>();
  for (const row of speciesNameRows) {
    if (row.local_language_id === '9') {
      speciesNames.set(Number(row.pokemon_species_id), row.name);
    }
  }

  // Form display names: form.id → English pokemon_name (e.g. "Mega Charizard X")
  const formDisplayNames = new Map<number, string>(); // form.id → name
  for (const row of formNamesRows) {
    if (row.local_language_id !== '9') continue;
    const name = row.pokemon_name?.trim();
    if (name) formDisplayNames.set(Number(row.pokemon_form_id), name);
  }

  // pokemon.id → form.id  (using pokemon_forms.pokemon_id)
  // Also: species_id → default identifier (for fallback name construction)
  const pokemonFormId = new Map<number, number>(); // pokemon.id → form.id
  const speciesDefaultIdentifier = new Map<number, string>(); // species.id → identifier
  for (const row of formsRows) {
    const pokemonId = Number(row.pokemon_id);
    const formId = Number(row.id);
    pokemonFormId.set(pokemonId, formId);
  }

  // Build species default identifier map from pokemon.csv default rows
  for (const row of pokemonRows) {
    if (row.is_default === '1') {
      speciesDefaultIdentifier.set(Number(row.species_id), row.identifier);
    }
  }

  // Pokemon stats (stat_id: 1=HP, 2=Atk, 3=Def, 4=SpA, 5=SpD, 6=Spe)
  const statsMap = new Map<number, Record<number, number>>();
  for (const row of statsRows) {
    const pid = Number(row.pokemon_id);
    const sid = Number(row.stat_id);
    if (!statsMap.has(pid)) statsMap.set(pid, {});
    statsMap.get(pid)![sid] = Number(row.base_stat);
  }

  // Pokemon types
  const typeMap = new Map<number, number[]>();
  for (const row of typesRows) {
    const pid = Number(row.pokemon_id);
    if (!typeMap.has(pid)) typeMap.set(pid, []);
    typeMap.get(pid)!.push(Number(row.type_id));
  }

  // Build pokemon map — ALL forms (no is_default filter)
  const pokemon = new Map<number, Pokemon>();
  for (const row of pokemonRows) {
    const id = Number(row.id);
    const speciesId = Number(row.species_id);
    const isDefault = row.is_default === '1';
    const rawStats = statsMap.get(id);
    if (!rawStats) continue;

    // Resolve display name
    const formId = pokemonFormId.get(id);
    let name: string;
    if (formId !== undefined && formDisplayNames.has(formId)) {
      name = formDisplayNames.get(formId)!;
    } else if (isDefault) {
      name = speciesNames.get(speciesId) ?? row.identifier;
    } else {
      // Fallback: "Charizard (Mega X)" constructed from identifier
      const speciesName = speciesNames.get(speciesId) ?? '';
      const baseIdentifier = speciesDefaultIdentifier.get(speciesId) ?? '';
      const suffix = formatFormSuffix(row.identifier, baseIdentifier);
      name = suffix ? `${speciesName} (${suffix})` : speciesName;
    }

    pokemon.set(id, {
      id,
      identifier: row.identifier,
      name,
      speciesId,
      isDefault,
      typeIds: typeMap.get(id) ?? [],
      stats: {
        hp: rawStats[1] ?? 0,
        atk: rawStats[2] ?? 0,
        def: rawStats[3] ?? 0,
        spa: rawStats[4] ?? 0,
        spd: rawStats[5] ?? 0,
        spe: rawStats[6] ?? 0,
      },
      abilities: (pokemonAbilitiesJson[id] ?? []).map((a: PokemonAbility) => ({
        identifier: a.identifier ?? '',
        name: a.name,
        description: a.description,
        isHidden: a.isHidden,
      })),
      weight: Number(row.weight) / 10,
    });
  }

  // ── Multi-hit move tables ────────────────────────────────────────────────────
  /**
   * PokeAPI effect IDs for moves that hit multiple times.
   * Values are { min, max } hits per use.
   *   30  — 2-5 hits at the same power (Bullet Seed, Rock Blast, Pin Missile, …)
   *   45  — exactly 2 hits (Double Hit, Dual Chop, Gear Grind, …)
   *   78  — exactly 2 hits with per-hit poison chance (Twineedle)
   *   105 — 1-3 hits with increasing power per hit (Triple Kick; modelled at base power)
   *   443 — 2-5 hits with a side-effect per hit (Scale Shot)
   */
  const MULTI_HIT_EFFECT_IDS: Record<number, { min: number; max: number }> = {
    30:  { min: 2, max: 5 },
    45:  { min: 2, max: 2 },
    78:  { min: 2, max: 2 },
    105: { min: 1, max: 3 },
    443: { min: 2, max: 5 },
  };
  /**
   * Move-level overrides for multi-hit counts when effect_id alone is insufficient.
   *   814 — Dual Wingbeat   (2 hits; effect_id = 1 in data)
   *   818 — Surging Strikes (always exactly 3 critical hits)
   *   813 — Triple Axel     (3 hits with increasing power; modelled at base power)
   *   860 — Population Bomb (1-10 hits)
   */
  const MULTI_HIT_MOVE_OVERRIDES: Record<number, { min: number; max: number }> = {
    814: { min: 2, max: 2 },
    818: { min: 3, max: 3 },
    813: { min: 3, max: 3 },
    860: { min: 1, max: 10 },
  };
  // ────────────────────────────────────────────────────────────────────────────

  /** Effect IDs for moves that always require a charge turn and can never OHKO in one action. */
  const TWO_TURN_ALWAYS_EFFECT_IDS = new Set([
    146,  // Skull Bash (raises Def first turn)
    156,  // Fly
    256,  // Dive
    257,  // Dig
    264,  // Bounce
    273,  // Shadow Force / Phantom Force (vanishes)
    312,  // Sky Drop
    332,  // Freeze Shock / Ice Burn
  ]);
  /** Move ID of Electro Shot — fires immediately in Rain, two-turn otherwise. */
  const ELECTRO_SHOT_MOVE_ID = 905;

  /** Effect IDs for moves whose power is computed from Pokémon weights or speeds. */
  const VARIABLE_POWER_EFFECT_IDS: Record<number, 'low-kick' | 'heavy-slam' | 'gyro-ball'> = {
    197: 'low-kick',   // Low Kick, Grass Knot
    292: 'heavy-slam', // Heavy Slam, Heat Crash
    220: 'gyro-ball',  // Gyro Ball
  };

  // English move names (language_id = 9)
  const moveNames = new Map<number, string>();
  for (const row of moveNamesRows) {
    if (row.local_language_id === '9') {
      moveNames.set(Number(row.move_id), row.name);
    }
  }

  // Moves (damaging only: power > 0 or variable power, damage_class 2 or 3)
  const moves = new Map<number, Move>();
  for (const row of movesRows) {
    const power = Number(row.power);
    const damageClassId = Number(row.damage_class_id);
    if (damageClassId !== 2 && damageClassId !== 3) continue;
    const id = Number(row.id);
    const effectId = Number(row.effect_id) || 0;
    const variablePower: Move['variablePower'] = VARIABLE_POWER_EFFECT_IDS[effectId];
    if ((!power || power <= 0) && !variablePower) continue;
    const rawAcc = row.accuracy;
    const accuracy = rawAcc === '' || rawAcc === undefined ? null : Number(rawAcc);
    const multiHit: { min: number; max: number } | null =
      MULTI_HIT_MOVE_OVERRIDES[id] ?? MULTI_HIT_EFFECT_IDS[effectId] ?? null;

    const twoTurn: Move['twoTurn'] =
      TWO_TURN_ALWAYS_EFFECT_IDS.has(effectId) ? 'always'
      : effectId === 152 ? 'no-sun'       // Solar Beam, Solar Blade
      : id === ELECTRO_SHOT_MOVE_ID ? 'no-rain'
      : undefined;

    moves.set(id, {
      id,
      identifier: row.identifier,
      name: moveNames.get(id) ?? row.identifier,
      typeId: Number(row.type_id),
      power,
      damageClassId,
      accuracy,
      description: moveDescriptions[id] ?? '',
      priority: Number(row.priority) || 0,
      flags: moveFlagsJson[String(id)] ?? [],
      effectId,
      effectChance: row.effect_chance !== '' && row.effect_chance !== undefined
        ? Number(row.effect_chance) : null,
      isSpread: [9, 11].includes(Number(row.target_id)), // all-adjacent or all-adjacent-foes
      multiHit,
      twoTurn,
      variablePower,
    });
  }

  // Pokemon -> moves mapping (all version groups, deduplicated)
  const pokemonMoves = new Map<number, Set<number>>();
  for (const row of pokemonMovesRows) {
    const pid = Number(row.pokemon_id);
    const mid = Number(row.move_id);
    if (!moves.has(mid)) continue;
    if (!pokemon.has(pid)) continue;
    if (!pokemonMoves.has(pid)) pokemonMoves.set(pid, new Set());
    pokemonMoves.get(pid)!.add(mid);
  }

  // Type efficacy map
  const typeEfficacy = new Map<string, number>();
  for (const row of typeEfficacyRows) {
    typeEfficacy.set(`${row.damage_type_id}-${row.target_type_id}`, Number(row.damage_factor));
  }

  // Type names (English)
  const typeNames = new Map<number, string>();
  for (const row of typeNameRows) {
    typeNames.set(Number(row.id), row.identifier);
  }

  const championsRoster = new Set<number>(championsRosterJson);

  return { pokemon, moves, pokemonMoves, typeEfficacy, typeNames, championsRoster };
}
