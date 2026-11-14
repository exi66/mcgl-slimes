import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/", "test/reference/build/"] },
  js.configs.recommended,
  {
    // Код юзерскрипта выполняется на странице карты.
    files: ["src/**/*.js"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["*.js", "test/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  {
    rules: {
      eqeqeq: "error",
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
