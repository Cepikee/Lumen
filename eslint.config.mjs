import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...[...nextVitals, ...nextTs].map((config) => ({
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules ?? {}).map(([name, value]) => {
        if (name === "@typescript-eslint/no-require-imports") return [name, "off"];
        if (
          name === "@typescript-eslint/no-explicit-any"
          || name === "@typescript-eslint/ban-ts-comment"
          || name === "react-hooks/refs"
          || name === "react-hooks/purity"
          || name === "react-hooks/rules-of-hooks"
          || name === "react-hooks/set-state-in-effect"
          || name === "@next/next/no-html-link-for-pages"
        ) return [name, "warn"];
        return [name, value];
      }),
    ),
  })),
  {
    rules: {
      "prefer-const": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
