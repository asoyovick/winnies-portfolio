import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      '.next-test/**',
      'node_modules/**',
      'data/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    // The route handlers read JSON bodies and database rows that have no
    // compile-time shape, so `any` is used deliberately at that boundary.
    files: ['src/app/api/**/route.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
