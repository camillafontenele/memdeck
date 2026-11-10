export function validateCard(front: string, back: string): boolean {
  return Boolean(front.trim() && back.trim());
}
