/** @type {import('jest').Config} */
const config = {
  testTimeout: 30000,
  projects: [
    {
      displayName: "backend",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: [
        "**/tests/unit.test.ts",
        "**/tests/ai-engine.test.ts",
      ],
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
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/integration.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "security",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/security.test.ts"],
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
      transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.json" }] },
    },
    {
      displayName: "ai",
      preset: "ts-jest",
      testEnvironment: "node",
      testMatch: ["**/tests/ai.test.ts"],
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
    
  ],
};

module.exports = config;