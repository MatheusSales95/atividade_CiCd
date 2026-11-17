// Configuracao dedicada a analise estatica de SEGURANCA do codigo (SAST).
// Fica separada do lint de estilo de proposito: sao preocupacoes distintas, e
// separa-las deixa claro no log do CI qual das duas reprovou.
import security from 'eslint-plugin-security';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  {
    files: ['**/*.ts', '**/*.mts', '**/*.mjs', '**/*.js'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      // Elevadas a erro: em uma API que recebe entrada externa, estas sao as
      // que realmente importam.
      'security/detect-child-process': 'error',
      'security/detect-eval-with-expression': 'error',
      'security/detect-unsafe-regex': 'error',
      'security/detect-possible-timing-attacks': 'error',
      // Mantidas como aviso: geram muito falso-positivo em acesso indexado.
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
    },
  },
];
