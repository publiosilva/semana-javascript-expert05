export default {
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.js', '!src/**/index.js'
  ],
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: [
    'text',
    'lcov'
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100
    }
  },
  restoreMocks: true,
  testEnvironment: 'node',
  transformIgnorePatterns: ['node_modules'],
  watchPathIgnorePatterns: [
    'node_modules'
  ]
}
