export type CardTone = "green" | "pink";

/**
 * Card colours for the shared-maps list. One column (mobile): green, pink,
 * green, pink… Two columns (`sm` and up) form a checkerboard: green, pink /
 * pink, green / green, pink…
 */
export function cardTones(index: number): { mobile: CardTone; desktop: CardTone } {
  const position = index % 4;
  return {
    mobile: index % 2 === 0 ? "green" : "pink",
    desktop: position === 0 || position === 3 ? "green" : "pink",
  };
}
