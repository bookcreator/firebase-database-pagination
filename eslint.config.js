const { defineConfig, globalIgnores } = require('eslint/config')
const js = require('@eslint/js')
const n = require('eslint-plugin-n')
const { default: mocha } = require('eslint-plugin-mocha')

module.exports = defineConfig([
   globalIgnores([
      'coverage/',
      '**/node_modules/**',
   ]),
   {
      name: 'Source',
      languageOptions: {
         ecmaVersion: 2024,
         sourceType: 'commonjs',
         parserOptions: {
            ecmaFeatures: {
               impliedStrict: true
            }
         },
         globals: {}
      },
      plugins: {
         js,
         n,
      },
      extends: [
         'js/recommended',
         'n/flat/recommended',
      ],
      settings: {
         node: {
            allowModules: [
               'firebase-admin',
               'timers'
            ]
         }
      },
      rules: {
         'n/global-require': 'error',
         'n/handle-callback-err': 'error',
         'n/no-path-concat': 'error',
         'n/no-new-require': 'error',
         'eqeqeq': 'error',
         'no-console': 'warn',
         'no-loop-func': 'error',
         'no-multi-spaces': 'warn',
         'no-trailing-spaces': [
            'error',
            {
               skipBlankLines: true
            }
         ],
         'no-unused-vars': [
            'warn',
            {
               argsIgnorePattern: '^_',
               varsIgnorePattern: '^_'
            }
         ],
         'quotes': [
            'error',
            'single',
            {
               allowTemplateLiterals: true
            }
         ],
         'semi': [
            'error',
            'never'
         ],
         'spaced-comment': [
            'error',
            'always',
            {
               markers: [
                  '/'
               ],
               exceptions: [
                  '*'
               ],
               block: {
                  balanced: true
               }
            }
         ]
      }
   },
   {
      name: 'Tests',
      files: [
         'test/**',
      ],
      plugins: {
         mocha,
      },
      extends: [
         'mocha/recommended',
      ],
      rules: {
         'n/global-require': 'off',
         'mocha/no-top-level-hooks': 'off',
         'mocha/no-setup-in-describe': 'off',
      }
   },
])
