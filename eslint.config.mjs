import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "dist/**",
      "build/**",
      "out/**",
      ".local-db/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
];
