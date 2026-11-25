// Colours for the station. The four brights come from the new TechXpress logo
// (sampled from a photo of the screen, so APPROXIMATE: replace with the exact
// values from the logo's source file when it arrives).
//
// Rule of thumb for the scene: dusk base and mid-tones everywhere; the logo
// brights only on things you can tap and on light sources.

export const LOGO = {
  yellow: '#F5B800',
  pink: '#E8508A',
  teal: '#18B3B0',
  violet: '#8E5BD0',
};

export const C = {
  ...LOGO,
  ink: '#151320', // outlines
  shadow: '#0E0C18', // sticker drop shadows
  white: '#F6F3EC',
  paper: '#F3E9D2',

  // Dusk sky
  sky0: '#12112A',
  sky1: '#251F4A',
  sky2: '#4B3474',
  sky3: '#A8507E',
  horizon: '#E8788C',

  // Roof and shadows
  roof: '#17141F',
  roof2: '#221D31',
  girder: '#2E2843',
  valance: '#2F5F6E',
  valanceDark: '#234652',

  // Far station building (beyond the train)
  far: '#3C3460',
  farDark: '#2D2650',
  farLit: '#FFC46B',

  // Train (the logo's white train)
  body: '#F4F1EA',
  bodyShade: '#D6D0E0',
  roofGrey: '#BDB6CC',
  glass: '#22204A',
  glassHi: '#3A3770',
  cabinWarm: '#FFC873',
  cabinDeep: '#5A2E4A',
  bellows: '#2A2438',

  // Platform
  stone: '#5D5772',
  stoneDark: '#4A4560',
  stoneLight: '#736C8C',
  coping: '#8A84A0',
  tactile: '#D9A000',

  // Fixtures
  pillar: '#2B2840',
  pillarHi: '#3D3958',
  ledCase: '#0D0B12',
  ledOn: '#FF9A1F',
  ledOff: '#3A2312',
  lamp: '#FFC24A',

  // People
  skin: '#A86B47',
  skinShade: '#8A5236',
  hair: '#1A1416',
  coat: '#1E1C29',
  coatHi: '#2E2B3D',
  brass: '#E0B040',
};

// Outline weights (scene units): thick in front, thinner further back.
export const LINE = { near: 6, mid: 4.5, far: 3 };

// Shorthand for an inked outline.
export const inked = (width = LINE.mid) => ({
  stroke: C.ink,
  strokeWidth: width,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
});
