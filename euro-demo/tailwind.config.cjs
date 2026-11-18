/** @type {import('tailwindcss').Config} */
const v = (n) => `rgb(var(--${n}) / <alpha-value>)`;
module.exports = {
  content: ['./src/**/*.ts'],
  darkMode: ['variant', [
    '@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) & }',
    ':root[data-theme="dark"] &',
  ]],
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        paper: v('paper'), surface: v('surface'), 'surface-2': v('surface-2'),
        ink: v('ink'), muted: v('muted'), line: v('line'),
        deep: v('deep'), 'deep-2': v('deep-2'),
        accent: v('accent'), 'accent-ink': v('accent-ink'), 'on-accent': v('on-accent'),
        ok: v('ok'),
      },
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next"', 'system-ui', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', '"Arial Narrow"', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: { out: 'cubic-bezier(.23,1,.32,1)' },
      maxWidth: { page: '1320px' },
    },
  },
  plugins: [],
};
