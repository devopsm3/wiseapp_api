import js from "@eslint/js";
import ts from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

export default [
  // 1️⃣ First, global ignores
  {
    ignores: ["dist", "node_modules"],
  },

  // 2️⃣ Base JS rules
  js.configs.recommended,

  // 3️⃣ TypeScript config
  {
    files: ["src/**/*.ts", "src/*.ts", "seeds/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        ...globals.node, // ✅ includes process, __dirname, console, etc.
      },
    },
    plugins: { "@typescript-eslint": ts },
    rules: {
      // "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "error",
      "no-unused-vars": "off",
      quotes: ["error", "double"],
      semi: ["error", "never"],
      indent: ["error", 4],
    },
  },
];
