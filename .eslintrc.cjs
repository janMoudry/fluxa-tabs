module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    es2022: true,
    browser: true,
    node: true,
  },
  ignorePatterns: ['dist/**', 'node_modules/**'],
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': 'warn',
    'import/order': [
      'warn',
      {
        groups: [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
        ],
        'newlines-between': 'always',
      },
    ],
    'import/no-default-export': 'warn',
    'import/no-cycle': ['warn', { ignoreExternal: true }],
  },
  overrides: [
    {
      files: ['test/**/*.ts'],
      env: { node: true },
      rules: {
        'import/no-default-export': 'off',
      },
    },
    {
      files: ['*.config.*', '*.config.js', '*.config.cjs'],
      rules: { 'import/no-default-export': 'off' },
    },
  ],
};
