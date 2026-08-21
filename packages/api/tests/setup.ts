// Global test setup — runs before each test file

// Silence console output during tests
global.console.info = jest.fn();
global.console.log = jest.fn();

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.TEST_DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5432/starter_kit_test";
// Shared runtime models read DATABASE_URL, while sequelize-cli reads the
// dedicated TEST_DATABASE_URL. Keep both test paths on the same database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.REDIS_URL = "redis://localhost:6379";
process.env.BULLMQ_PREFIX = "starter-kit-test";
