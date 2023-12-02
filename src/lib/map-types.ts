export type World = {
  info: Info;
  settings: Settings;
  mapCoordinates: Coords;
  pack: Pack;
  grid: Grid;
  biomesData: Biomes;
  notes: Note[];
  nameBases: NameBase[];
}

export type Biomes = {
  i: number[];
  name: string[];
  color: string[];
  biomesMartix: { [key: string]: number }[];
  habitability: number[];
  iconsDensity: number[];
  icons: Array<string[]>;
  cost: number[];
}

export type Pack = {
  cells: PackCell[];
  vertices: Vertex[];
  features: Array<FeatureClass | number>;
  cultures: Culture[];
  burgs: Burg[];
  states: State[];
  provinces: Array<ProvinceClass | number>;
  religions: Religion[];
  rivers: River[];
  markers: Marker[];
}

export type Grid = {
    cells: GridCell[];
    vertices: Vertex[];
    cellsDesired: number;
    spacing: number;
    cellsX: number;
    cellsY: number;
    points: [number, number][];
    boundary: [number, number][];
    seed: string,
    features: Array<FeatureClass | number>;
  }
export type Burg = {
  cell?: number;
  x?: number;
  y?: number;
  state?: number;
  i?: number;
  culture?: number;
  name?: string;
  feature?: number;
  capital?: number;
  port?: number;
  population?: number;
  type?: BurgType;
  coa?: Coa;
  citadel?: number;
  plaza?: number;
  walls?: number;
  shanty?: number;
  temple?: number;
}

export type Coa = {
  t1: string;
  ordinaries?: Ordinary[];
  charges?: Charge[];
  shield: Shield;
  division?: DivisionClass;
}

export type Charge = {
  charge: string;
  t: HeraldicTincture;
  t2?: HeraldicTincture;
  t3?: HeraldicTincture;
  p: string;
  size: number;
  divided?: Divided;
  sinister?: number;
  reversed?: number;
}

const divideds = ["counter", "dexter", "sinister"] as const;
export type Divided = (typeof divideds)[number];

const heraldicTinctures = [
  "argent",
  "azure",
  "gules",
  "or",
  "purpure",
  "sable",
  "vert",
] as const;
export type HeraldicTincture = (typeof heraldicTinctures)[number];

export type DivisionClass = {
  division: DivisionType;
  t: string;
  line?: string;
}

const divisionTypes = [
  "chevronny",
  "gyronny",
  "perBend",
  "perBendSinister",
  "perChevron",
  "perChevronReversed",
  "perCross",
  "perFess",
  "perPale",
  "perPile",
  "perSaltire",
] as const;

export type DivisionType = (typeof divisionTypes)[number];

export type Ordinary = {
  ordinary: string;
  t: HeraldicTincture;
  line?: string;
  divided?: string;
}

const shields = [
  "banner",
  "boeotian",
  "easterling",
  "erebor",
  "fantasy1",
  "fantasy5",
  "gondor",
  "heater",
  "hessen",
  "horsehead2",
  "ironHills",
  "moriaOrc",
  "oldFrench",
  "oval",
  "pavise",
  "roman",
  "round",
  "spanish",
  "urukHai",
  "wedged",
] as const;
export type Shield = (typeof shields)[number];

const burgTypes = ["Generic", "Hunting", "Lake", "Naval"] as const;

export type BurgType = (typeof burgTypes)[number];

export type GridCell = {
  i: number;
  v: number[];
  c: number[];
  b: number;
  f: number;
  t: number;
  h: number;
  temp: number;
  prec: number;
}

export type PackCell = {
  i: number;
  v: number[];
  c: number[];
  p: number[];
  g: number;
  h: number;
  area: number;
  f: number;
  t: number;
  haven: number;
  harbor: number;
  fl: number;
  r: number;
  conf: number;
  biome: number;
  s: number;
  pop: number;
  culture: number;
  burg: number;
  road: number;
  crossroad: number;
  state: number;
  religion: number;
  province: number;
}

export type Culture = {
  name: string;
  i: number;
  base: number;
  origins: Array<number | null>;
  shield: Shield;
  center?: number;
  color?: string;
  type?: string;
  expansionism?: number;
  code?: string;
}

export type FeatureClass = {
  i: number;
  land: boolean;
  border: boolean;
  type: FeatureType;
  cells: number;
  firstCell: number;
  group: string;
  area?: number;
  vertices?: number[];
  shoreline?: number[];
  height?: number;
  flux?: number;
  temp?: number;
  evaporation?: number;
  inlets?: number[];
  outlet?: number;
  name?: string;
}

export type FeatureType = "ocean" | "lake" | "island";

export type Marker = {
  icon: string;
  type: string;
  px?: number;
  x: number;
  y: number;
  cell: number;
  i: number;
  dy?: number;
  dx?: number;
}

export type ProvinceClass = {
  i: number;
  state: number;
  center: number;
  burg: number;
  name: string;
  formName: string;
  fullName: string;
  color: string;
  coa: Coa;
}

export type Religion = {
  name: string;
  i: number;
  origins: number[] | null;
  type?: ReligionType;
  form?: string;
  culture?: number;
  center?: number;
  deity?: null | string;
  expansion?: Expansion;
  expansionism?: number;
  color?: string;
  code?: string;
}

const expansions = ["culture", "global", "state"];
export type Expansion = (typeof expansions)[number];

const religions = ["Folk", "Organized"];

export type ReligionType = (typeof religions)[number];

export type River = {
  i: number;
  source: number;
  mouth: number;
  discharge: number;
  length: number;
  width: number;
  widthFactor: number;
  sourceWidth: number;
  parent: number;
  cells: number[];
  basin: number;
  name: string;
  type: RiverType;
}

const rivers = ["Branch", "Brook", "Creek", "Fork", "River", "Stream"] as const;
export type RiverType = (typeof rivers)[number];

export type State = {
  i: number;
  name: string;
  urban: number;
  rural: number;
  burgs: number;
  area: number;
  cells: number;
  neighbors: number[];
  diplomacy: Array<string[] | DiplomaticStatus>;
  provinces: number[];
  color?: string;
  expansionism?: number;
  capital?: number;
  type?: string;
  center?: number;
  culture?: number;
  coa?: Coa;
  campaigns?: Campaign[];
  form?: Government;
  formName?: string;
  fullName?: string;
  pole?: number[];
  alert?: number;
  military?: StateMilitary[];
}

export type Campaign = {
  name: string;
  start: number;
  end: number;
}

const diplomaticStatuses = [
  "Ally",
  "Enemy",
  "Friendly",
  "Neutral",
  "Rival",
  "Suspicion",
  "Suzerain",
  "Unknown",
  "Vassal",
  "x",
] as const;

export type DiplomaticStatus = (typeof diplomaticStatuses)[number];

const governments = ["Monarchy", "Theocracy", "Republic"] as const;

export type Government = (typeof governments)[number];

export type StateMilitary = {
  i: number;
  a: number;
  cell: number;
  x: number;
  y: number;
  bx: number;
  by: number;
  u: U;
  n: number;
  name: string;
  state: number;
  icon: Icon;
}

export type Icon = "🏹" | "💣" | "🐴" | "🌊" | "⚔️" | "👑";

export type U = {
  cavalry?: number;
  infantry?: number;
  archers?: number;
  artillery?: number;
  fleet?: number;
}

export type Coords = {
  latT: number;
  latN: number;
  latS: number;
  lonT: number;
  lonW: number;
  lonE: number;
}

export type Info = {
  version: string;
  description: string;
  exportedAt: Date | string;
  mapName: string;
  seed: string;
  mapId: number;
}

export type NameBase = {
  name: string;
  i: number;
  min: number;
  max: number;
  d: string;
  m: number;
  b: string;
}

export type Note = {
  id: string;
  name: string;
  legend: string;
}

export type Settings = {
  distanceUnit: string;
  distanceScale: string;
  areaUnit: string;
  heightUnit: string;
  heightExponent: string;
  temperatureScale: string;
  barSize: string;
  barLabel: string;
  barBackOpacity: string;
  barBackColor: string;
  barPosX: string;
  barPosY: string;
  populationRate: number;
  urbanization: number;
  mapSize: string;
  latitudeO: string;
  prec: string;
  options: Options;
  mapName: string;
  hideLabels: boolean;
  stylePreset: string;
  rescaleLabels: boolean;
  urbanDensity: number;
}

export type Options = {
  pinNotes: boolean;
  showMFCGMap: boolean;
  winds: number[];
  temperatureEquator: number;
  temperatureNorthPole: number;
  temperatureSouthPole: number;
  stateLabelsMode: string;
  year: number;
  era: string;
  eraShort: string;
  military: OptionsMilitary[];
}

export type OptionsMilitary = {
  icon: Icon;
  name: string;
  rural: number;
  urban: number;
  crew: number;
  power: number;
  type: string;
  separate: number;
}

export type Vertex = {
  i: number;
  p: [number, number];
  v: [number, number, number];
  c: [number, number, number];
}

export type WorldRule = (world: World) => World;