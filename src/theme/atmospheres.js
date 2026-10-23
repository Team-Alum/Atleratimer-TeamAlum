// Central atmosphere system.
//
// Every preset is a complete palette, not just an accent colour: it describes
// the ambient wash, sidebar tint, card surfaces, borders, text, controls, timer
// ring and glass surfaces. `light` and `dark` are authored separately so the
// atmosphere and the existing theme switch work together instead of fighting.
//
// The resolved values are published as CSS custom properties on <html>. Keeping
// this in one module means a component never needs to know a literal colour —
// it consumes semantic tokens (see index.css) and inherits the atmosphere.

export const DEFAULT_ATMOSPHERE = 'aurora';
export const APPEARANCE_CACHE_KEY = 'atleratimer_appearance_v1';

export const ATMOSPHERES = [
  {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'Midnight navy · aurora teal',
    description: 'Cool blue-green light over deep navy surfaces.',
    dark: {
      bg: '#070C14',
      sidebar: '#0A121D',
      surface: '#0E1826',
      elevated: '#132133',
      text: '#F1F7FC',
      accent: '#38D3E6',
      accent2: '#6EE7C8',
      onAccent: '#04161B',
      ring: ['#8AF3FF', '#2CC9DF', '#7C9DFF'],
      ambient: ['rgba(35, 211, 238, 0.20)', 'rgba(58, 107, 255, 0.15)', 'rgba(45, 212, 191, 0.10)'],
      veil: 'rgba(4, 8, 14, 0.42)',
    },
    light: {
      bg: '#F2F7FA',
      sidebar: '#FBFDFF',
      surface: '#FFFFFF',
      elevated: '#F7FBFD',
      text: '#0E1B26',
      accent: '#067E8C',
      accent2: '#0F9F9A',
      onAccent: '#FFFFFF',
      ring: ['#5CD6E8', '#078596', '#6C8CF5'],
      ambient: ['rgba(14, 165, 183, 0.13)', 'rgba(59, 130, 246, 0.10)', 'rgba(45, 212, 191, 0.08)'],
      veil: 'rgba(247, 251, 253, 0.42)',
    },
  },
  {
    id: 'violet-dusk',
    name: 'Violet Dusk',
    tagline: 'Deep indigo · soft lavender',
    description: 'Cinematic violet light with quiet, muted surfaces.',
    dark: {
      bg: '#0B0814',
      sidebar: '#120D1F',
      surface: '#171024',
      elevated: '#1E1530',
      text: '#F4F0FC',
      accent: '#A78BFA',
      accent2: '#E879F9',
      onAccent: '#170B2E',
      ring: ['#D8CCFF', '#8B5CF6', '#E879F9'],
      ambient: ['rgba(139, 92, 246, 0.22)', 'rgba(232, 121, 249, 0.12)', 'rgba(99, 102, 241, 0.14)'],
      veil: 'rgba(9, 6, 17, 0.44)',
    },
    light: {
      bg: '#F8F5FC',
      sidebar: '#FDFBFF',
      surface: '#FFFFFF',
      elevated: '#FAF7FF',
      text: '#1B1430',
      accent: '#7C3AED',
      accent2: '#C026D3',
      onAccent: '#FFFFFF',
      ring: ['#B794F6', '#7C3AED', '#D946EF'],
      ambient: ['rgba(124, 58, 237, 0.12)', 'rgba(192, 38, 211, 0.08)', 'rgba(99, 102, 241, 0.10)'],
      veil: 'rgba(250, 247, 255, 0.44)',
    },
  },
  {
    id: 'ocean-depth',
    name: 'Ocean Depth',
    tagline: 'Blue-black · turquoise',
    description: 'Layered oceanic blues with cool, spacious highlights.',
    dark: {
      bg: '#04101A',
      sidebar: '#071826',
      surface: '#0A1F30',
      elevated: '#0D283C',
      text: '#EFF9FF',
      accent: '#2DD4BF',
      accent2: '#38BDF8',
      onAccent: '#041519',
      ring: ['#99F6E4', '#14B8A6', '#3B82F6'],
      ambient: ['rgba(20, 184, 166, 0.20)', 'rgba(56, 189, 248, 0.15)', 'rgba(37, 99, 235, 0.13)'],
      veil: 'rgba(3, 11, 19, 0.40)',
    },
    light: {
      bg: '#F1F8FB',
      sidebar: '#FAFDFF',
      surface: '#FFFFFF',
      elevated: '#F5FAFD',
      text: '#0A2230',
      accent: '#0F766E',
      accent2: '#0369A1',
      onAccent: '#FFFFFF',
      ring: ['#5EEAD4', '#0D9488', '#2563EB'],
      ambient: ['rgba(13, 148, 136, 0.12)', 'rgba(3, 105, 161, 0.10)', 'rgba(37, 99, 235, 0.08)'],
      veil: 'rgba(246, 252, 255, 0.42)',
    },
  },
  {
    id: 'sunset-amber',
    name: 'Sunset Amber',
    tagline: 'Charcoal · burnt amber',
    description: 'Warm evening light with restrained amber and coral.',
    dark: {
      bg: '#120C09',
      sidebar: '#1A120D',
      surface: '#221711',
      elevated: '#2B1E16',
      text: '#FDF6EE',
      accent: '#F59E0B',
      accent2: '#FB7185',
      onAccent: '#241304',
      ring: ['#FDE68A', '#F59E0B', '#FB7185'],
      ambient: ['rgba(245, 158, 11, 0.18)', 'rgba(251, 113, 133, 0.12)', 'rgba(180, 83, 9, 0.14)'],
      veil: 'rgba(14, 8, 5, 0.42)',
    },
    light: {
      bg: '#FBF6EF',
      sidebar: '#FFFDF9',
      surface: '#FFFDF9',
      elevated: '#FFF9F0',
      text: '#251A10',
      accent: '#B45309',
      accent2: '#BE123C',
      onAccent: '#FFFFFF',
      ring: ['#F5C66B', '#D97706', '#E11D48'],
      ambient: ['rgba(217, 119, 6, 0.12)', 'rgba(190, 18, 60, 0.07)', 'rgba(245, 158, 11, 0.10)'],
      veil: 'rgba(255, 250, 242, 0.46)',
    },
  },
  {
    id: 'forest-calm',
    name: 'Forest Calm',
    tagline: 'Deep forest · sage mint',
    description: 'Grounded greens with gentle natural contrast.',
    dark: {
      bg: '#07110C',
      sidebar: '#0B1711',
      surface: '#101F17',
      elevated: '#15281E',
      text: '#F0FAF4',
      accent: '#34D399',
      accent2: '#A3E635',
      onAccent: '#04160D',
      ring: ['#A7F3D0', '#10B981', '#84CC16'],
      ambient: ['rgba(16, 185, 129, 0.18)', 'rgba(132, 204, 22, 0.10)', 'rgba(5, 150, 105, 0.16)'],
      veil: 'rgba(5, 13, 9, 0.40)',
    },
    light: {
      bg: '#F2F8F3',
      sidebar: '#FBFEFC',
      surface: '#FFFFFF',
      elevated: '#F6FBF7',
      text: '#10231A',
      accent: '#047857',
      accent2: '#4D7C0F',
      onAccent: '#FFFFFF',
      ring: ['#6EE7B7', '#059669', '#65A30D'],
      ambient: ['rgba(5, 150, 105, 0.11)', 'rgba(77, 124, 15, 0.08)', 'rgba(52, 211, 153, 0.10)'],
      veil: 'rgba(247, 253, 249, 0.44)',
    },
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    tagline: 'Plum charcoal · dusty rose',
    description: 'Elegant rose-violet highlights without neon glare.',
    dark: {
      bg: '#120A10',
      sidebar: '#1A0F17',
      surface: '#23141F',
      elevated: '#2C1A28',
      text: '#FCF2F7',
      accent: '#F472B6',
      accent2: '#C084FC',
      onAccent: '#2A0A1B',
      ring: ['#FBCFE8', '#EC4899', '#A78BFA'],
      ambient: ['rgba(236, 72, 153, 0.18)', 'rgba(168, 85, 247, 0.14)', 'rgba(244, 114, 182, 0.10)'],
      veil: 'rgba(15, 8, 13, 0.42)',
    },
    light: {
      bg: '#FBF4F7',
      sidebar: '#FFFBFD',
      surface: '#FFFFFF',
      elevated: '#FEF7FB',
      text: '#2A1420',
      accent: '#BE185D',
      accent2: '#7E22CE',
      onAccent: '#FFFFFF',
      ring: ['#F9A8D4', '#DB2777', '#8B5CF6'],
      ambient: ['rgba(219, 39, 119, 0.09)', 'rgba(126, 34, 206, 0.08)', 'rgba(244, 114, 182, 0.10)'],
      veil: 'rgba(255, 249, 252, 0.46)',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    tagline: 'Slate · silver · white',
    description: 'Minimal neutral surfaces with no decorative colour.',
    dark: {
      bg: '#0A0B0D',
      sidebar: '#101214',
      surface: '#16181C',
      elevated: '#1D2025',
      text: '#F5F6F7',
      accent: '#CBD5E1',
      accent2: '#94A3B8',
      onAccent: '#0B0D10',
      ring: ['#F8FAFC', '#CBD5E1', '#94A3B8'],
      ambient: ['rgba(203, 213, 225, 0.09)', 'rgba(148, 163, 184, 0.07)', 'rgba(100, 116, 139, 0.08)'],
      veil: 'rgba(8, 9, 11, 0.46)',
    },
    light: {
      bg: '#F4F5F7',
      sidebar: '#FCFCFD',
      surface: '#FFFFFF',
      elevated: '#F8F9FA',
      text: '#14171C',
      accent: '#334155',
      accent2: '#64748B',
      onAccent: '#FFFFFF',
      ring: ['#94A3B8', '#334155', '#CBD5E1'],
      ambient: ['rgba(51, 65, 85, 0.08)', 'rgba(100, 116, 139, 0.06)', 'rgba(148, 163, 184, 0.08)'],
      veil: 'rgba(249, 250, 251, 0.50)',
    },
  },
  {
    id: 'light-studio',
    name: 'Light Studio',
    tagline: 'Warm off-white · teal',
    description: 'Bright studio surfaces with crisp, confident contrast.',
    dark: {
      bg: '#101210',
      sidebar: '#161915',
      surface: '#1C201B',
      elevated: '#22271F',
      text: '#F7F8F3',
      accent: '#5EEAD4',
      accent2: '#99F6E4',
      onAccent: '#06211C',
      ring: ['#A7F3D0', '#14B8A6', '#5EEAD4'],
      ambient: ['rgba(20, 184, 166, 0.16)', 'rgba(234, 179, 8, 0.08)', 'rgba(16, 185, 129, 0.10)'],
      veil: 'rgba(12, 14, 11, 0.40)',
    },
    light: {
      bg: '#FBF9F4',
      sidebar: '#FFFFFF',
      surface: '#FFFFFF',
      elevated: '#FFFDF8',
      text: '#1B2430',
      accent: '#0F766E',
      accent2: '#0E7490',
      onAccent: '#FFFFFF',
      ring: ['#5EEAD4', '#0F766E', '#0891B2'],
      ambient: ['rgba(15, 118, 110, 0.10)', 'rgba(14, 116, 144, 0.07)', 'rgba(234, 179, 8, 0.08)'],
      veil: 'rgba(255, 252, 245, 0.46)',
    },
  },
];

const ATMOSPHERE_BY_ID = new Map(ATMOSPHERES.map((preset) => [preset.id, preset]));

export function getAtmosphere(id) {
  return ATMOSPHERE_BY_ID.get(id) || ATMOSPHERE_BY_ID.get(DEFAULT_ATMOSPHERE);
}

export function getAtmospherePalette(id, mode) {
  const preset = getAtmosphere(id);
  return preset[mode === 'dark' ? 'dark' : 'light'];
}

export function getAtmosphereRing(id, mode) {
  const palette = getAtmospherePalette(id, mode);
  return {
    stops: palette.ring,
    glow: rgba(palette.ring[1], 0.5),
    accent: palette.accent,
  };
}

// --- colour maths ----------------------------------------------------------
// Small sRGB helpers instead of a dependency. They are only used at startup /
// when a preset changes, never per frame.
export function hexToRgb(hex) {
  const clean = String(hex).replace('#', '').trim();
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return [0, 0, 0];
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function mix(a, b, amount) {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const t = Math.min(1, Math.max(0, amount));
  const to = (from, target) => Math.round(from + (target - from) * t).toString(16).padStart(2, '0');
  return `#${to(ar, br)}${to(ag, bg)}${to(ab, bb)}`;
}

export function darken(hex, amount) {
  return mix(hex, '#000000', amount);
}

export function contrastRatio(a, b) {
  const luminance = (hex) => {
    const [r, g, b] = hexToRgb(hex).map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

// Build the full semantic token map for one atmosphere + theme combination.
export function buildAtmosphereTokens(id, mode) {
  const preset = getAtmosphere(id);
  const dark = mode === 'dark';
  const palette = preset[dark ? 'dark' : 'light'];

  const surfaceSoft = mix(palette.surface, palette.text, dark ? 0.075 : 0.045);
  const surfaceCard = rgba(palette.surface, dark ? 0.86 : 0.86);
  const surfaceSecondaryBase = mix(palette.surface, palette.bg, dark ? 0.16 : 0.32);
  const surfaceSecondary = rgba(surfaceSecondaryBase, dark ? 0.82 : 0.84);
  const surfaceRaised = rgba(palette.elevated, dark ? 0.92 : 0.94);
  const sidebarSurface = rgba(palette.sidebar, dark ? 0.84 : 0.78);

  const secondary = mix(palette.text, palette.bg, dark ? 0.34 : 0.28);
  // Light-mode muted text is intentionally darker than the old #94A3B8 so it
  // stays above 4.5:1 on white cards at 11–12px.
  const muted = mix(palette.text, palette.bg, dark ? 0.50 : 0.36);

  const border = rgba(palette.text, dark ? 0.14 : 0.12);
  const borderSubtle = rgba(palette.text, dark ? 0.08 : 0.065);
  const accentSoft = rgba(palette.accent, dark ? 0.14 : 0.10);
  const accentSoftHover = rgba(palette.accent, dark ? 0.22 : 0.16);
  const quoteSurface = mix(palette.surface, palette.accent, dark ? 0.08 : 0.055);
  const completedBg = rgba(palette.accent, dark ? 0.16 : 0.12);
  const chartInactive = rgba(palette.accent, dark ? 0.24 : 0.20);
  const glassStrong = rgba(palette.surface, dark ? 0.80 : 0.72);
  const glassSoft = rgba(palette.surface, dark ? 0.58 : 0.52);
  const glassFallback = rgba(palette.surface, 0.97);

  const accentDark = darken(palette.accent, dark ? 0.12 : 0.16);

  return {
    // legacy tokens (kept for the existing stylesheet)
    '--bg-main': palette.bg,
    '--bg-sidebar': palette.sidebar,
    '--bg-card': palette.surface,
    '--text-primary': palette.text,
    '--text-secondary': secondary,
    '--text-muted': muted,
    '--accent-teal': palette.accent,
    '--accent-teal-dark': accentDark,
    '--accent-cyan': palette.ring[0],
    '--accent-soft': accentSoft,
    '--accent-soft-hover': accentSoftHover,
    '--border-color': border,
    '--border-subtle': borderSubtle,
    '--surface-soft': surfaceSoft,
    '--surface-quote': quoteSurface,
    '--completed-bg': completedBg,
    '--chart-bar-inactive': chartInactive,
    '--chart-bar-active': palette.accent,
    '--card-shadow': dark
      ? '0 24px 52px -26px rgba(0, 0, 0, 0.86), 0 2px 12px -5px rgba(0, 0, 0, 0.55)'
      : '0 20px 46px -28px rgba(15, 23, 42, 0.24), 0 2px 10px -6px rgba(15, 23, 42, 0.10)',
    '--glass-bg': glassSoft,
    '--glass-bg-strong': glassStrong,
    '--glass-bg-fallback': glassFallback,
    '--glass-border': border,
    '--glass-blur': dark ? 'blur(20px) saturate(150%)' : 'blur(22px) saturate(140%)',

    // semantic surface / text / accent tokens
    '--app-background': palette.bg,
    '--surface-primary': surfaceCard,
    '--surface-secondary': surfaceSecondary,
    '--surface-elevated': surfaceRaised,
    '--surface-muted': surfaceSoft,
    '--sidebar-surface': sidebarSurface,
    '--sidebar-border': borderSubtle,
    '--accent-primary': palette.accent,
    '--accent-secondary': palette.accent2,
    '--text-on-accent': palette.onAccent,
    '--focus-ring': rgba(palette.accent, dark ? 0.72 : 0.65),

    // states (semantic, shared across presets for predictability)
    '--state-success': dark ? '#34D399' : '#047857',
    '--state-warning': dark ? '#FBBF24' : '#B45309',
    '--state-error': dark ? '#F87171' : '#DC2626',

    // atmosphere-specific decoration
    '--atmo-accent': palette.accent,
    '--atmo-accent-2': palette.accent2,
    '--atmo-ring-a': palette.ring[0],
    '--atmo-ring-b': palette.ring[1],
    '--atmo-ring-c': palette.ring[2],
    '--atmo-ring-glow': rgba(palette.ring[1], dark ? 0.5 : 0.34),
    '--timer-sheen': rgba(palette.accent, dark ? 0.11 : 0.07),
    '--ambient-base': palette.bg,
    '--ambient-a': palette.ambient[0],
    '--ambient-b': palette.ambient[1],
    '--ambient-c': palette.ambient[2],
    '--ambient-veil': palette.veil,
    '--ambient-video-filter': dark
      ? 'saturate(1.05) brightness(0.72)'
      : 'saturate(0.95) brightness(0.92)',
    '--ambient-video-opacity': dark ? '0.62' : '0.42',
    '--selection-bg': rgba(palette.accent, 0.28),
    '--shadow-glow': `0 0 34px -10px ${rgba(palette.accent, 0.55)}`,
  };
}

// Apply tokens to <html> and remember the last resolved map. The cache is read
// by the inline bootstrap in index.html so the first paint already matches the
// saved atmosphere (no white/black flash).
export function applyAtmosphere(id, mode) {
  if (typeof document === 'undefined') return {};
  const safeId = ATMOSPHERE_BY_ID.has(id) ? id : DEFAULT_ATMOSPHERE;
  const safeMode = mode === 'dark' ? 'dark' : 'light';
  const vars = buildAtmosphereTokens(safeId, safeMode);
  const root = document.documentElement;

  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  root.setAttribute('data-theme', safeMode);
  root.setAttribute('data-atmosphere', safeId);
  root.style.colorScheme = safeMode;

  try {
    localStorage.setItem(
      APPEARANCE_CACHE_KEY,
      JSON.stringify({ atmosphere: safeId, mode: safeMode, vars })
    );
  } catch {
    // Appearance caching is a nicety; storage may be unavailable.
  }

  return vars;
}
