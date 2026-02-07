const baseConfig = {
  preset: 'ts-jest/presets/default-esm',
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.jest.json',
      },
    ],
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'mjs',
    'jsx',
    'mts',
    'json',
    'node',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/frontend/', '/dist/'],
  resetModules: false,
  testTimeout: 60000,
  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^auth:config$': '<rootDir>/test/__mocks__/auth-config.ts',
  },
};

export default {
  projects: [
    {
      ...baseConfig,
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/test/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/frontend/',
        '/dist/',
        '<rootDir>/test/client.test.ts',
      ],
    },
    {
      ...baseConfig,
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/test/client.test.ts'],
    },
  ],
  collectCoverage: true,
  coverageDirectory: './build/coverage',
  collectCoverageFrom: ['src/**/*.{ts,tsx,js,jsx}', '!src/**/*.d.ts'],
  coverageReporters: ['clover', 'cobertura', 'lcov'],
  coveragePathIgnorePatterns: ['/dist/', '/node_modules/'],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './build/reports',
        outputName: 'junit.xml',
      },
    ],
  ],
};
