import js from '@eslint/js';
import ts from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default ts.config(
 { ignores: ['**/dist/**','**/node_modules/**','**/.wrangler/**','**/worker-configuration.d.ts','test-results/**','playwright-report/**'] },
 js.configs.recommended, ...ts.configs.recommended,
 { files: ['**/*.ts','**/*.tsx'], languageOptions: { parserOptions: { project: './tsconfig.json' } }, rules: { '@typescript-eslint/no-floating-promises':'error','@typescript-eslint/no-misused-promises':'error' } },
 { files:['apps/web/src/**/*.tsx'], plugins:{'react-hooks':hooks}, rules:hooks.configs.recommended.rules }
);
