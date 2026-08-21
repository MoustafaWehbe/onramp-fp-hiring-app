// Global test setup — runs before each test file

// Silence console output during tests
global.console.info = jest.fn();
global.console.log = jest.fn();

// Set test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
// 127.0.0.1, not localhost: on hosts where "localhost" resolves to the IPv6
// loopback first, connections hang rather than falling back to IPv4 when
// only the IPv4 side is actually listening (e.g. Docker's default port
// publishing, which binds 0.0.0.0 but not [::]).
process.env.DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/starter_kit_test";
process.env.REDIS_URL = "redis://127.0.0.1:6379";
process.env.BULLMQ_PREFIX = "starter-kit-test";
