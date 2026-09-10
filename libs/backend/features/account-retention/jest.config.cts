/* eslint-disable */
const { readFileSync } = require('fs');

// Reading the SWC compilation config for the spec files
const swcJestConfig = JSON.parse(
  readFileSync(`${__dirname}/.spec.swcrc`, 'utf-8'),
);

// Disable .swcrc look-up by SWC core because we're passing in swcJestConfig ourselves
swcJestConfig.swcrc = false;

module.exports = {
  displayName: 'backend-features-account-retention',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['@swc/jest', swcJestConfig],
  },
  // `@nestjs/schedule@12` is pure ESM (`"type": "module"`), which the CJS
  // Jest runtime can't `require`. Let SWC transpile it (and nothing else in
  // node_modules) down to CJS for the test run. Production (webpack) bundles
  // it natively and is unaffected.
  transformIgnorePatterns: ['/node_modules/(?!(?:@nestjs/schedule)/)'],
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: 'test-output/jest/coverage',
};
