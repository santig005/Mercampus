export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/**
 * A required environment variable is missing, so the call was never going to
 * succeed - unlike a database timeout or a bad response from a third party,
 * retrying does nothing until a human sets the variable. Kept as its own
 * class (not just an AppError with a 500) so errorResponse
 * (src/lib/api-response.ts) can tell the two apart and stop telling the user
 * to try again for something that structurally can't work. See T-113.
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500);
    this.name = 'ConfigError';
  }
}
