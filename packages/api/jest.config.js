/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup.ts"],
  moduleNameMapper: {
    "^@starter-kit/shared$": "<rootDir>/../shared/src/index.ts",
    "^@starter-kit/shared/(.*)$": "<rootDir>/../shared/$1",
  },
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "./tsconfig.json" }],
  },
};
