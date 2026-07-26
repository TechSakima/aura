import bcrypt from "bcryptjs";

export class PinValidationError extends Error {
  constructor(message = "PIN must be 4 digits") {
    super(message);
    this.name = "PinValidationError";
  }
}

export function isValidPin(pin: string) {
  return /^\d{4}$/.test(pin);
}

export async function hashPin(pin: string) {
  if (!isValidPin(pin)) {
    throw new PinValidationError();
  }
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string) {
  return bcrypt.compare(pin, hash);
}
