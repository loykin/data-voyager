import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@data-voyager/shared-ui$': '<rootDir>/../../shared/frontend/src/index.ts',
    '^@data-voyager/shared-ui/(.*)$': '<rootDir>/../../shared/frontend/src/$1',
    '^@data-voyager/sdk$': '<rootDir>/../../sdk/frontend/src/index.ts',
    '^@data-voyager/sdk/(.*)$': '<rootDir>/../../sdk/frontend/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        module: 'commonjs',
        moduleResolution: 'node',
      },
    }],
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
}

export default config
