import "@testing-library/jest-dom/vitest";

process.env.SKIP_ENV_VALIDATION = "1";
// Vitest sets NODE_ENV=test when running tests; no need to set here
