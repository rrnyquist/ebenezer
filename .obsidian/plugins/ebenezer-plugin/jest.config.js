// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^obsidian$': '<rootDir>/__mocks__/obsidian.js'
  }
};
