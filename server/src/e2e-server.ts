if (process.env.NODE_ENV === 'production') {
  throw new Error('E2E server cannot run in production.');
}

process.env.E2E_TEST = 'true';

void import('./index').catch((error) => {
  console.error('Failed to start E2E backend:', error);
  process.exitCode = 1;
});