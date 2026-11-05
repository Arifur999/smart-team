// Imported first by main.ts so gateway decorators see the env when their modules load.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env file: rely on the real environment.
}
