import typescriptEslint from "@typescript-eslint/eslint-plugin";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import vue from "eslint-plugin-vue";
import js from "@eslint/js";
import globals from "globals";
import path from "node:path";
import autoEslint from "./auto-eslint.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      "**/node_modules",
      "**/dist",
      "**/out",
      "**/.gitignore",
      "**/auto-imports.d.ts",
      "**/components.d.ts",
    ],
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-essential",
  ),
  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
      vue,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...autoEslint.globals,
      },

      ecmaVersion: "latest",
      sourceType: "module",

      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
    },

    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: ["**/.eslintrc.{js,cjs}"],

    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 5,
      sourceType: "commonjs",
    },
  },
];
