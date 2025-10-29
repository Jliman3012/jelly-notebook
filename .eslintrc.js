module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'next',
    'next/core-web-vitals'
  ],
  ignorePatterns: ['dist', 'build', 'coverage', '.next'],
  env: {
    node: true,
    es2021: true,
  },
};
