import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'public/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { window: 'readonly', document: 'readonly', console: 'readonly', process: 'readonly', URL: 'readonly' } },
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { module: 'writable', require: 'readonly' } } },
);
