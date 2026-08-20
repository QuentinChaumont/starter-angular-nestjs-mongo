# backend-testing

Shared test helpers for writing unit and E2E tests against the other
`backend-*` libs, without recopying the same boilerplate into every spec
file: `buildTestConfig`, `startTestMongo`, `listenOnRandomPort`,
`signTestJwt`, `nonExistentObjectId`.

## Running unit tests

Run `nx test backend-testing` to execute the unit tests via [Jest](https://jestjs.io).
