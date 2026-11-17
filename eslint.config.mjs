import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import security from 'eslint-plugin-security';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    // O plugin fica registrado aqui para que as diretivas eslint-disable de
    // regras security/* sejam reconhecidas; a ENFORCE fica na config de SAST.
    plugins: { security },
    // As diretivas eslint-disable de regras security/* so sao AVALIADAS na
    // config de SAST; aqui elas pareceriam nao utilizadas.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    rules: {
      // O middleware de erro do Express exige 4 parametros, mesmo sem usar o ultimo.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    // O proprio arquivo de configuracao nao faz parte do projeto TypeScript.
    files: ['eslint.config.mjs', 'eslint.security.config.mjs', 'scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { console: 'readonly', process: 'readonly' },
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  },
  prettier,
);
