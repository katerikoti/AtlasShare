import { describe, expect, it } from "vitest";

import { cardTones } from "./card-tones";

const sequence = (count: number, layout: "mobile" | "desktop") =>
  Array.from({ length: count }, (_, index) => cardTones(index)[layout]);

describe("cardTones", () => {
  it("alternates green and pink in a single column", () => {
    expect(sequence(6, "mobile")).toEqual([
      "green",
      "pink",
      "green",
      "pink",
      "green",
      "pink",
    ]);
  });

  it("forms a checkerboard in two columns", () => {
    const tones = sequence(6, "desktop");
    const rows = [tones.slice(0, 2), tones.slice(2, 4), tones.slice(4, 6)];

    expect(rows).toEqual([
      ["green", "pink"],
      ["pink", "green"],
      ["green", "pink"],
    ]);
  });

  it("never puts the same colour next to itself in either layout", () => {
    for (const layout of ["mobile", "desktop"] as const) {
      const tones = sequence(12, layout);
      for (let index = 0; index < tones.length; index += 1) {
        const columns = layout === "mobile" ? 1 : 2;
        const right = columns === 2 && index % 2 === 0 ? tones[index + 1] : null;
        const below = tones[index + columns];
        if (right) expect(right).not.toBe(tones[index]);
        if (below) expect(below).not.toBe(tones[index]);
      }
    }
  });
});
