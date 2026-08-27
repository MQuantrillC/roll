import { describe, expect, it } from "vitest";
import { parseBulkList } from "./bulkListParser";

const titles = (text: string) => parseBulkList(text).items.map((i) => i.title);

describe("parseBulkList", () => {
  it("parses plain lines", () => {
    expect(titles("Interstellar\nThe Dark Knight\nDune")).toEqual([
      "Interstellar",
      "The Dark Knight",
      "Dune",
    ]);
  });

  it("strips bullets", () => {
    expect(titles("- Interstellar\n* Dune\n• Parasite\n– Arrival")).toEqual([
      "Interstellar",
      "Dune",
      "Parasite",
      "Arrival",
    ]);
  });

  it("strips numbering in many formats", () => {
    expect(titles("1. Interstellar\n2) Dune\n(3) Parasite\n04. Arrival\n5 - Whiplash")).toEqual([
      "Interstellar",
      "Dune",
      "Parasite",
      "Arrival",
      "Whiplash",
    ]);
  });

  it("strips surrounding quotes", () => {
    expect(titles('"Interstellar"\n“Dune”\n\'Parasite\'')).toEqual([
      "Interstellar",
      "Dune",
      "Parasite",
    ]);
  });

  it("handles messy mixed formatting", () => {
    const messy = `- Interstellar

2. The Dark Knight
3) Dune

The Prestige
    Parasite

Arrival
`;
    expect(titles(messy)).toEqual([
      "Interstellar",
      "The Dark Knight",
      "Dune",
      "The Prestige",
      "Parasite",
      "Arrival",
    ]);
  });

  it("preserves punctuation inside titles", () => {
    expect(titles("Dune: Part Two\nM*A*S*H\nWhat's Eating Gilbert Grape\n8½")).toEqual([
      "Dune: Part Two",
      "M*A*S*H",
      "What's Eating Gilbert Grape",
      "8½",
    ]);
  });

  it("does not strip purely numeric titles", () => {
    expect(titles("1917\n300\n2012")).toEqual(["1917", "300", "2012"]);
  });

  it("detects duplicates case-insensitively and with decoration", () => {
    const res = parseBulkList("Interstellar\ninterstellar\n- Interstellar\nDune");
    expect(res.items.map((i) => i.title)).toEqual(["Interstellar", "Dune"]);
    expect(res.duplicates).toHaveLength(2);
  });

  it("ignores blank input", () => {
    expect(parseBulkList("").items).toEqual([]);
    expect(parseBulkList("\n\n   \n").items).toEqual([]);
  });

  it("normalizes CRLF line endings", () => {
    expect(titles("Interstellar\r\nDune\rParasite")).toEqual([
      "Interstellar",
      "Dune",
      "Parasite",
    ]);
  });
});
