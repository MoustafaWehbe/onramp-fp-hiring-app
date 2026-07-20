import baseConfig from "../shared/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "no-undef": "off",
    },
  },
];
