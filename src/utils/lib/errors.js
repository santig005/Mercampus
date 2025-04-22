// utils/lib/errors.js
export class AppError extends Error {
    constructor(message, status = 500) {
      super(message);
      this.name = "AppError";
      this.status = status;
    }
  }
  