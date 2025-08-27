module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
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
    // Disable standard rules that conflict with TypeScript
    'no-unused-vars': 'off',
    'no-undef': 'off',
    
    // TypeScript-specific rules (enhanced batch)
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'warn',
    '@typescript-eslint/prefer-as-const': 'error',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/no-var-requires': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    
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
    
    // Code quality and style (fourth batch)
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'max-len': ['warn', { code: 120, ignoreStrings: true, ignoreComments: true }],
    
    // Additional strict rules
    'no-unused-expressions': 'error',
    'no-console': 'off', // Keep console for server logging
    'sort-imports': ['error', { ignoreDeclarationSort: true }],
    'no-empty-function': 'warn',
    'no-magic-numbers': ['warn', { ignore: [-1, 0, 1, 2, 10, 100, 1000] }],
    
    // Fifth batch: More strict code quality rules
    'no-shadow': 'error',
    'no-param-reassign': 'warn',
    'prefer-destructuring': ['warn', { object: true, array: false }],
    'no-nested-ternary': 'warn',
    
    // Sixth batch: Advanced code quality and consistency
    'consistent-return': 'warn',
    'default-case': 'warn',
    'no-fallthrough': 'error',
    'radix': 'error',
    
    // Seventh batch: TypeScript strict rules
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    
    // Eighth batch: Final strict rules for maximum code quality
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for current codebase
    '@typescript-eslint/strict-boolean-expressions': 'off', // Can break existing logic
    '@typescript-eslint/prefer-literal-enum-member': 'warn',
  },
};