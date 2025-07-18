module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/d3-app/$1',
    '^@components/(.*)$': '<rootDir>/src/d3-app/components/$1',
    '^@services/(.*)$': '<rootDir>/src/d3-app/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/d3-app/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/d3-app/types/$1',
    '^@hooks/(.*)$': '<rootDir>/src/d3-app/hooks/$1',
    '^@contexts/(.*)$': '<rootDir>/src/d3-app/contexts/$1',
    '^@styles/(.*)$': '<rootDir>/src/d3-app/styles/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.{ts,tsx}',
    '!src/**/*.stories.{ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80
    }
  },
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: {
        jsx: 'react'
      }
    }
  }
};