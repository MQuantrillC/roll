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

describe("parseBulkList — Letterboxd CSV", () => {
  const csv = `Date,Name,Year,Letterboxd URI
2024-01-15,Interstellar,2014,https://boxd.it/abc
2024-02-01,"Dune",2021,https://boxd.it/def
2024-02-10,"Love, Death & Robots",2019,https://boxd.it/ghi
2024-03-01,Parasite,,https://boxd.it/jkl`;

  it("detects the CSV format and extracts names + years", () => {
    const res = parseBulkList(csv);
    expect(res.source).toBe("csv");
    expect(res.items).toEqual([
      { title: "Interstellar", normalized: "interstellar", year: 2014 },
      { title: "Dune", normalized: "dune", year: 2021 },
      { title: "Love, Death & Robots", normalized: "love death robots", year: 2019 },
      { title: "Parasite", normalized: "parasite", year: undefined },
    ]);
  });

  it("handles quoted fields with commas and escaped quotes", () => {
    const tricky = `Name,Year
"What's Up, Doc?",1972
"The ""Best"" Movie",2000`;
    const res = parseBulkList(tricky);
    expect(res.items.map((i) => i.title)).toEqual(['What\'s Up, Doc?', 'The "Best" Movie']);
  });

  it("does not mistake a normal title containing a comma for CSV", () => {
    const res = parseBulkList("I, Tonya\nLove, Actually");
    expect(res.source).toBe("lines");
    expect(res.items.map((i) => i.title)).toEqual(["I, Tonya", "Love, Actually"]);
  });
});

describe("parseBulkList — MyAnimeList XML", () => {
  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<myanimelist>
  <anime>
    <series_animedb_id>5114</series_animedb_id>
    <series_title><![CDATA[Fullmetal Alchemist: Brotherhood]]></series_title>
  </anime>
  <anime>
    <series_title><![CDATA[Steins;Gate]]></series_title>
  </anime>
  <anime>
    <series_title>Attack on Titan</series_title>
  </anime>
  <anime>
    <series_title><![CDATA[Steins;Gate]]></series_title>
  </anime>
</myanimelist>`;

  it("extracts series titles from CDATA and plain tags, deduping repeats", () => {
    const res = parseBulkList(xml);
    expect(res.source).toBe("mal-xml");
    expect(res.items.map((i) => i.title)).toEqual([
      "Fullmetal Alchemist: Brotherhood",
      "Steins;Gate",
      "Attack on Titan",
    ]);
    expect(res.duplicates).toHaveLength(1);
  });
});
