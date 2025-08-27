module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended'
  ],
  root: true,
  env: {
    node: true,
    es6: true,
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist/',
    'node_modules/',
    'client/',
    'database/',
    'logs/',
    'docs/',
    '**/*.d.ts',
  ],
  rules: {
    // Disable problematic rules for now
    'no-unused-vars': 'off',
    'no-undef': 'off',
    
    // Basic code quality rules
    'prefer-const': 'error',
    'no-var': 'error',
    'comma-dangle': ['error', 'always-multiline'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'semi': ['error', 'always'],
    'indent': ['error', 2, { SwitchCase: 1 }],
    
    // Error prevention
    'no-duplicate-imports': 'error',
    'no-unreachable': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
  },
};