module.exports = {
  preset: 'ts-jest',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'reports',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  reporters: ['default', ['jest-junit', { outputDirectory: '<rootDir>/reports/', uniqueOutputName: 'true' }]],
  setupFiles: [],
  setupFilesAfterEnv: ['jest-extended', '<rootDir>/testSetup.js'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/?(*.)test.ts'],
  transformIgnorePatterns: ['[/\\\\]node_modules(/)[/\\\\].+\\.js$'],
};
