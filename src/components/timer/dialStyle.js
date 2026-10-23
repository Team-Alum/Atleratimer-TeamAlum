// Dial-only appearance presets.
//
// Nothing here touches the page chrome. The values are published as CSS custom
// properties on the dial container (see CircularTimer.jsx / DialFace.jsx), so a
// scheme, mood or effect can never leak into the rest of the application.

export const DIAL_SCHEMES = [
  // `stops: null` means "resolve from the active atmosphere" (see getDialLook).
  { id: 'atmosphere', name: 'Atmosphere', stops: null },
  { id: 'teal', name: 'Teal', stops: ['#62DCE7', '#078596', '#A5B4FC'] },
  { id: 'cyan', name: 'Cyan', stops: ['#67E8F9', '#06B6D4', '#38BDF8'] },
  { id: 'ocean', name: 'Ocean', stops: ['#93C5FD', '#2563EB', '#6366F1'] },
  { id: 'violet', name: 'Violet', stops: ['#C4B5FD', '#7C3AED', '#F0ABFC'] },
  { id: 'rose', name: 'Rose', stops: ['#FDA4AF', '#E11D48', '#C084FC'] },
  { id: 'amber', name: 'Amber', stops: ['#FDE68A', '#F59E0B', '#FB923C'] },
  { id: 'emerald', name: 'Emerald', stops: ['#6EE7B7', '#059669', '#34D399'] },
  { id: 'slate', name: 'Slate', stops: ['#CBD5E1', '#475569', '#94A3B8'] },
];

export const DIAL_MOODS = [
  { id: 'natural', name: 'Natural' },
  { id: 'calm', name: 'Calm' },
  { id: 'focused', name: 'Focused' },
  { id: 'energized', name: 'Energized' },
  { id: 'cozy', name: 'Cozy' },
];

// A mood is a colour grade, not a separate palette: every scheme keeps its
// identity while the grade shifts saturation, lightness, warmth and glow.
const MOOD_GRADES = {
  natural: { saturation: 1, lightness: 0, hue: 0, glowAlpha: 0.45 },
  calm: { saturation: 0.8, lightness: 7, hue: 0, glowAlpha: 0.32 },
  focused: { saturation: 1.05, lightness: -8, hue: 0, glowAlpha: 0.55 },
  energized: { saturation: 1.35, lightness: 2, hue: 0, glowAlpha: 0.7 },
  cozy: { saturation: 0.95, lightness: 6, hue: 16, glowAlpha: 0.42 },
};

export const DIAL_COMFORT = [
  { id: 'compact', name: 'Compact', stroke: 9 },
  { id: 'balanced', name: 'Balanced', stroke: 12 },
  { id: 'spacious', name: 'Spacious', stroke: 16 },
];

export const DIAL_EFFECTS = [
  { id: 'none', name: 'None' },
  { id: 'glow', name: 'Glow' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'pulse', name: 'Pulse' },
];

export const DIAL_DEFAULTS = {
  scheme: 'atmosphere',
  mood: 'natural',
  comfort: 'balanced',
  effect: 'glow',
};

const FALLBACK_SCHEME = DIAL_SCHEMES[0];
const FALLBACK_STOPS = DIAL_SCHEMES.find((scheme) => scheme.stops)?.stops || ['#62DCE7', '#078596', '#A5B4FC'];
const FALLBACK_COMFORT = DIAL_COMFORT[1];

function hexToRgb(hex) {
  const clean = String(hex).replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r, g, b) {
  const channel = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

function rgbToHsl(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;

  if (max === min) return [0, 0, lightness];

  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue;
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;

  return [hue * 60, saturation, lightness];
}

function hslToHex(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, lightness));
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
  const match = l - chroma / 2;

  let rgb;
  if (h < 60) rgb = [chroma, x, 0];
  else if (h < 120) rgb = [x, chroma, 0];
  else if (h < 180) rgb = [0, chroma, x];
  else if (h < 240) rgb = [0, x, chroma];
  else if (h < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];

  return rgbToHex((rgb[0] + match) * 255, (rgb[1] + match) * 255, (rgb[2] + match) * 255);
}

function gradeHex(hex, grade) {
  const [hue, saturation, lightness] = rgbToHsl(...hexToRgb(hex));
  return hslToHex(hue + grade.hue, saturation * grade.saturation, lightness + grade.lightness / 100);
}

// Resolve a stored dial style into a validated, render-ready description.
// Unknown ids fall back to the defaults, so corrupt or stale storage can never
// produce an unstyled dial.
//
// `atmosphereLook` is the active preset's ring ({ stops, glow }) for the
// current light/dark mode. It is only consulted when the chosen scheme is
// "Atmosphere", so an explicit dial palette is never overridden.
export function getDialLook(style = {}, atmosphereLook = null) {
  const scheme = DIAL_SCHEMES.find((s) => s.id === style.scheme) || FALLBACK_SCHEME;
  const mood = DIAL_MOODS.find((m) => m.id === style.mood) ? style.mood : DIAL_DEFAULTS.mood;
  const comfort = DIAL_COMFORT.find((c) => c.id === style.comfort) || FALLBACK_COMFORT;
  const effect = DIAL_EFFECTS.some((e) => e.id === style.effect) ? style.effect : DIAL_DEFAULTS.effect;

  const baseStops = scheme.stops
    || (atmosphereLook?.stops?.length === 3 ? atmosphereLook.stops : FALLBACK_STOPS);
  const grade = MOOD_GRADES[mood] || MOOD_GRADES.natural;
  const stops = baseStops.map((hex) => gradeHex(hex, grade));
  const [red, green, blue] = hexToRgb(stops[1]);

  return {
    scheme: scheme.id,
    schemeName: scheme.name,
    isAtmosphere: scheme.id === 'atmosphere',
    mood,
    comfort: comfort.id,
    effect,
    strokeWidth: comfort.stroke,
    stops,
    vars: {
      '--dial-a': stops[0],
      '--dial-b': stops[1],
      '--dial-c': stops[2],
      '--dial-glow': `rgba(${red}, ${green}, ${blue}, ${grade.glowAlpha})`,
    },
  };
}

// Swatch preview for a scheme, graded with the same mood currently in use so
// the picker reflects exactly what the dial will look like.
export function getSchemeSwatch(schemeId, mood, atmosphereLook = null) {
  const look = getDialLook({ scheme: schemeId, mood }, atmosphereLook);
  return `linear-gradient(135deg, ${look.stops[0]} 0%, ${look.stops[1]} 50%, ${look.stops[2]} 100%)`;
}
