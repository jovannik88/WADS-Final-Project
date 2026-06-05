/** @type {import('jest').Config} */
const config = {
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
  ],
};

module.exports = config;