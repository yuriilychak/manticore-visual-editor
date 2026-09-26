/** @type {import('jest').Config} */
module.exports = {
  clearMocks: true,
  collectCoverageFrom: ['src/renderer/components/**/*.{ts,tsx}', '!src/renderer/components/**/index.ts'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/src/renderer/setupTests.ts'],
  moduleNameMapper: {
    '^@manticore/project$': '<rootDir>/../../packages/project/src/index.ts',
    '^@manticore/project/(.*)$': '<rootDir>/../../packages/project/src/$1.ts',
    '^image-polygonizer$': '<rootDir>/src/renderer/__mocks__/image-polygonizer.ts'
  },
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }]
  }
};
