/**
 * A well-formed, 24-hex-character Mongo ObjectId string that (barring
 * astronomical bad luck) does not exist in the database — for asserting
 * "not found" behavior distinctly from "malformed id" behavior.
 */
export function nonExistentObjectId(): string {
  return '0'.repeat(24);
}
