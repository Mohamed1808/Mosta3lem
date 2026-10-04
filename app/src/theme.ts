/** Mosta3lem design tokens: neutral surfaces with one accent, matching the prototype. */
export const colors = {
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surface2: '#F0F2F5',
  surface3: '#E7EAEF',
  border: '#E1E4EA',
  borderStrong: '#C9CED8',
  text: '#18202B',
  text2: '#4F5A6B',
  text3: '#818B9B',
  accent: '#1D5BA6',
  accentSoft: '#E7EFF9',
  accentText: '#174B8A',
  ink: '#111A26',
  ok: '#1A7446', okBg: '#E5F3EB',
  warn: '#8F5B00', warnBg: '#FCF1D9',
  bad: '#B42318', badBg: '#FCEBE9',
  info: '#1D5BA6', infoBg: '#E7EFF9',
  pend: '#0B6A80', pendBg: '#E1F1F5',
  neutral: '#4F5A6B', neutralBg: '#ECEFF3',
};

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'pending' | 'accent' | 'muted';

export const toneColors: Record<Tone, { fg: string; bg: string }> = {
  neutral: { fg: colors.neutral, bg: colors.neutralBg },
  info: { fg: colors.info, bg: colors.infoBg },
  success: { fg: colors.ok, bg: colors.okBg },
  warning: { fg: colors.warn, bg: colors.warnBg },
  danger: { fg: colors.bad, bg: colors.badBg },
  pending: { fg: colors.pend, bg: colors.pendBg },
  accent: { fg: '#1F3F6E', bg: '#E3EBF7' },
  muted: { fg: colors.text3, bg: colors.surface2 },
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 6, md: 10, lg: 14, pill: 999 };
export const font = { xs: 11.5, sm: 13, md: 15, lg: 17, xl: 20, xxl: 26 };
