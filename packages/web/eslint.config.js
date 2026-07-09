import baseConfig from "../shared/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-undef": "off",
    },
  },
];
