/** @type {import('jest').Config} */
const config = {
  testTimeout: 30000,
  projects: [
    {
      displayName: "backend",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/unit.test.ts", "**/tests/ai-engine.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "frontend",
      preset: "ts-jest",
      testEnvironment: "jsdom",
      testMatch: ["**/tests/frontend.test.tsx"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "ai-engine",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/ai-engine.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "ai-consistency",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/ai-consistency.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "ai-failure",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/ai-failure.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "ai-abuse",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/ai-abuse.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    // integration, security, ai.test.ts excluded from CI
    // run locally with: npx jest tests/integration.test.ts
  ],
};

module.exports = config;