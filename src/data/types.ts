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
}

export interface Move {
  id: number;
  identifier: string;
  name: string;
  typeId: number;
  power: number;
  damageClassId: number; // 2 = physical, 3 = special
  accuracy: number | null; // null = always hits (e.g. Swift, Aerial Ace)
  description: string;
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
}
