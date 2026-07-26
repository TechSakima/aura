import { customAlphabet } from "nanoid";

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const publicToken = customAlphabet(alphabet, 22);
export const shortId = customAlphabet(alphabet, 12);
