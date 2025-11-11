// eslint.config.js

import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  // Configuración base de ESLint
  pluginJs.configs.recommended,

  // Configuración específica para archivos .vue
  ...pluginVue.configs['flat/recommended'],

  // Configuración para desactivar reglas que entran en conflicto con Prettier
  eslintConfigPrettier,

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        // --- Añade tus variables globales aquí si es necesario ---
        // Por ejemplo, si Quasar las define globalmente:
        // 'quasar': 'readonly',
      },
      // Especifica el parser correcto para Vue
      parser: pluginVue.parser,
      parserOptions: {
        parser: '@babel/eslint-parser', // O '@typescript-eslint/parser' si usas TS
        sourceType: 'module',
        ecmaVersion: 'latest',
        requireConfigFile: false, // Importante para Babel
        babelOptions: {
          parserOpts: {
            plugins: ['importAssertions'],
          },
        },
      },
    },
    // Reglas personalizadas
    rules: {
      // Puedes añadir o sobrescribir reglas de ESLint aquí
      // Por ejemplo, para ser menos estricto con variables no usadas en desarrollo:
      'no-unused-vars': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      'vue/multi-word-component-names': 'off', // Desactiva la regla que exige nombres de componente de varias palabras
    },
  },
  {
    // Ignorar carpetas y archivos específicos
    ignores: [
      '.quasar/',
      'dist/',
      'node_modules/',
      'public/',
      'src-capacitor/',
      'src-cordova/',
    ],
  },
];
