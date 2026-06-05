/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  // ai-engine.test.ts = unit tests (no server needed)
  // unit.test.ts      = unit tests for API routes (no server needed)
  // api.test.ts       = integration tests (requires running server + TEST_SESSION_COOKIE)
  testMatch: [
    "**/tests/ai-engine.test.ts",
    "**/tests/unit.test.ts",
  ],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
};

module.exports = config;