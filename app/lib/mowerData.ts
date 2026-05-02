export const OTHER = 'Other / Not Listed'

export interface MowerMake {
  make: string
  models: string[]
}

export const MOWER_MAKES: MowerMake[] = [
  { make: 'Ariens',     models: ['Edge 34', 'Razor 42', 'IKON XD 52', 'IKON XL 60', 'Zoom XL 60'] },
  { make: 'Bad Boy',    models: ['ZT Elite 48', 'ZT Elite 54', 'Outlaw XP 61', 'Renegade 61', 'Maverick 48'] },
  { make: 'Cub Cadet',  models: ['XT1 LT42', 'XT1 LT46', 'XT1 GT54', 'ZT1 42', 'ZT1 50', 'ZT2 60'] },
  { make: 'EGO',        models: ['LM2020SP', 'LM2100SP', 'LM2135SP', 'LM2156SP'] },
  { make: 'Honda',      models: ['HRN216VKA', 'HRR216VKA', 'HRX217VKA', 'HRX217HZA', 'HRS216PKA'] },
  {
    make: 'Husqvarna',
    models: ['TC238', 'YTH18542', 'YTH21K46', 'Z242F', 'Z246', 'Z254', 'MZ54', 'MZ61', 'TS 348D'],
  },
  {
    make: 'John Deere',
    models: [
      'E130', 'E140', 'E150', 'E160',
      'S130',
      'X350', 'X354', 'X380', 'X390', 'X570', 'X580', 'X590',
      'Z315E', 'Z335E', 'Z345M', 'Z355E', 'Z375R', 'Z530M',
    ],
  },
  { make: 'Kubota',      models: ['BX2380', 'GR2120', 'Z125S', 'Z421', 'Z423', 'Z724X', 'Z726X'] },
  { make: 'Poulan Pro',  models: ['P46XT', 'P46ZX', 'PB19546LT', 'PR17542STA'] },
  { make: 'Ryobi',       models: ['RY40108A', 'RY40180B', 'RY401170', 'RY48111', 'RY48130'] },
  {
    make: 'Scag',
    models: ['Cheetah II', 'Freedom Z', 'Patriot', 'Tiger Cat II', 'Turf Tiger II', 'V-Ride II'],
  },
  { make: 'Snapper',    models: ['NXT2346', 'S2765E', 'SPX110', 'SPX110KW', 'ZTX5200'] },
  {
    make: 'Toro',
    models: [
      'Grandstand 48', 'Recycler 22', 'Super Recycler 21',
      'TimeCutter SS5000', 'TimeCutter MX5050', 'Titan 60D', 'Z Master 2000',
    ],
  },
  { make: 'Troy-Bilt',  models: ['Bronco 42', 'Mustang 46', 'Pony 42', 'Pony 46', 'TB30 R'] },
  { make: 'Worx',        models: ['WG743', 'WG744', 'WG779', 'WG784'] },
]
