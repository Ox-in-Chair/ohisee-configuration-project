import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // TypeScript ESLint recommended type-checked rules
  ...tseslint.configs.recommendedTypeChecked,

  // Global ignores - files to exclude from linting
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "dist/**",
    "coverage/**",
    "*.config.js",
    "*.config.mjs",
    ".env*",
    // Test files and E2E tests
    "**/__tests__/**/*",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
    "tests/e2e/**/*",
    "tests/playwright/**/*",
    "jest.setup.js",
    "jest.e2e.setup.js",
    "jest.config.js",
    // Supabase functions
    "supabase/functions/**/*",
    // Scripts and utilities
    "scripts/**/*",
    // Generated types
    "lib/types/supabase.ts",
    "types/database.ts",
  ]),

  // Custom strict rules configuration
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript strict rules - relaxed for pragmatic development
      "@typescript-eslint/no-explicit-any": "warn", // Warn instead of error
      "@typescript-eslint/no-unused-vars": [
        "warn", // Warn instead of error
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "off", // Too verbose for React components

      // Disable rules requiring strictNullChecks (currently disabled in tsconfig)
      "@typescript-eslint/strict-boolean-expressions": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",

      // Async/Promise safety rules - warnings for now (TODO: fix and make errors)
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-misused-promises": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/await-thenable": "warn",

      // Relax type assertion rules (common in tests and type guards)
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",

      // Disable overly strict rules
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-empty-object-type": "off", // Allow {} for flexibility

      // React Hooks rules (already included in next config, but being explicit)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // React Compiler rules - disable for now (TODO: fix components)
      "react-compiler/react-compiler": "off",

      // TypeScript additional relaxed rules
      "@typescript-eslint/ban-ts-comment": "warn", // Allow @ts-ignore with warning
      "@typescript-eslint/triple-slash-reference": "warn",
      "@typescript-eslint/no-duplicate-type-constituents": "warn",
      "@typescript-eslint/no-redundant-type-constituents": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/no-require-imports": "warn",

      // General JavaScript/TypeScript best practices
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "eqeqeq": "warn", // Warn instead of error for == vs ===
      "no-var": "error",
      "prefer-const": "warn", // Warn instead of error
      "prefer-template": "warn",
      "no-nested-ternary": "warn",
      "no-unneeded-ternary": "warn",

      // React specific rules
      "react/jsx-no-leaked-render": "warn",
      "react/jsx-curly-brace-presence": ["warn", { props: "never", children: "never" }],
      "react/no-unescaped-entities": "warn", // Warn for quotes in JSX

      // Next.js specific overrides (relax some rules for Next.js patterns)
      "@next/next/no-html-link-for-pages": "off", // We use next/link properly
      "@next/next/no-assign-module-variable": "warn", // Allow module assignments with warning
    },
  },
]);

export default eslintConfig;
