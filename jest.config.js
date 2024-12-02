/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  clearMocks: true,
  forceExit: true,
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/src/app.ts",
    "<rootDir>/src/@types/express.d.ts",
    "<rootDir>/src/config",
    "<rootDir>/src/seeds/seed.ts",
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}", // Inclui arquivos TypeScript
    "!src/**/__tests__/**/*", // Ignora arquivos de testes na contagem de cobertura
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageDirectory: "<rootDir>/coverage",
  coverageReporters: ["text", "lcov"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  moduleFileExtensions: ["ts", "js", "json", "node"],
};
