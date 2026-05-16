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
  weight: number; // kg (hectograms ÷ 10 from the CSV)
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
  /**
   * For moves that hit multiple times: the minimum and maximum number of hits per use.
   * null for standard single-hit moves.
   *
   * Note: Triple Axel and Triple Kick have increasing power per hit — here we model
   * them at base power as an approximation. Parental Bond is handled separately.
   */
  multiHit: { min: number; max: number } | null;
  /**
   * When set, this move requires a charge turn and cannot be used in a single action.
   * 'always'  — always two-turn (Dig, Fly, Dive, Bounce, Shadow Force, Skull Bash, etc.)
   * 'no-sun'  — fires immediately in Sun, two-turn otherwise (Solar Beam, Solar Blade)
   * 'no-rain' — fires immediately in Rain, two-turn otherwise (Electro Shot)
   */
  twoTurn?: 'always' | 'no-sun' | 'no-rain';
  /**
   * When set, the move's power is computed at runtime from Pokémon weights or speeds.
   * 'low-kick'   — based on target weight (Low Kick, Grass Knot)
   * 'heavy-slam' — based on attacker/target weight ratio (Heavy Slam, Heat Crash)
   * 'gyro-ball'  — based on target speed / attacker speed (Gyro Ball)
   */
  variablePower?: 'low-kick' | 'heavy-slam' | 'gyro-ball';
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
  championsRoster: Set<number>; // Pokémon IDs (form-level) available in Pokémon Champions
}
