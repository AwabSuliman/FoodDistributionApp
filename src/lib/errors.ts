export class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

export function publicErrorMessage(error: unknown) {
  return error instanceof PublicError ? error.message : "Something went wrong. Please try again.";
}
