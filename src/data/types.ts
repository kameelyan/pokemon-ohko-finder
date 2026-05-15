export interface PokemonAbility {
  identifier: string;
  name: string;
  description: string;
  isHidden: boolean;
}

export interface Pokemon {
  id: number;
  identifier: string;
  name: string;
  speciesId: number;
  isDefault: boolean;
  typeIds: number[];
  stats: {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
  };
  abilities: PokemonAbility[];
}

export type MoveFlag = 'contact' | 'punch' | 'sound' | 'powder' | 'bite' | 'pulse' | 'ballistics' | 'dance';

export interface Move {
  id: number;
  identifier: string;
  name: string;
  typeId: number;
  power: number;
  damageClassId: number; // 2 = physical, 3 = special
  accuracy: number | null; // null = always hits (e.g. Swift, Aerial Ace)
  description: string;
  priority: number;       // 0 = normal, +1/+2 = fast priority, negative = slow
  flags: MoveFlag[];
  effectId: number;             // PokeAPI effect_id — used to identify self-debuff effects
  effectChance: number | null; // chance of secondary effect (> 0 = Sheer Force applicable)
  isSpread: boolean;     // hits multiple targets (×0.75 in doubles): target_id 9 or 11
}

export interface PokemonMoveEntry {
  pokemonId: number;
  moveId: number;
}

export interface TypeEfficacy {
  damageTypeId: number;
  targetTypeId: number;
  damageFactor: number; // 0, 50, 100, 200
}

export interface GameData {
  pokemon: Map<number, Pokemon>;
  moves: Map<number, Move>;
  pokemonMoves: Map<number, Set<number>>; // pokemonId -> Set<moveId>
  typeEfficacy: Map<string, number>; // `${atkType}-${defType}` -> factor
  typeNames: Map<number, string>;
  championsRoster: Set<number>; // species IDs available in Pokémon Champions
}
