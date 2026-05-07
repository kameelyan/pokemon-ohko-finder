// Data is served relative to the app base path (import.meta.env.BASE_URL).
import type { GameData, Move, Pokemon } from './types';

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
    });
  }

  // English move names (language_id = 9)
  const moveNames = new Map<number, string>();
  for (const row of moveNamesRows) {
    if (row.local_language_id === '9') {
      moveNames.set(Number(row.move_id), row.name);
    }
  }

  // Moves (damaging only: power > 0, damage_class 2 or 3)
  const moves = new Map<number, Move>();
  for (const row of movesRows) {
    const power = Number(row.power);
    const damageClassId = Number(row.damage_class_id);
    if (!power || power <= 0) continue;
    if (damageClassId !== 2 && damageClassId !== 3) continue;
    const id = Number(row.id);
    const rawAcc = row.accuracy;
    const accuracy = rawAcc === '' || rawAcc === undefined ? null : Number(rawAcc);
    moves.set(id, {
      id,
      identifier: row.identifier,
      name: moveNames.get(id) ?? row.identifier,
      typeId: Number(row.type_id),
      power,
      damageClassId,
      accuracy,
      description: moveDescriptions[id] ?? '',
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

  return { pokemon, moves, pokemonMoves, typeEfficacy, typeNames };
}
