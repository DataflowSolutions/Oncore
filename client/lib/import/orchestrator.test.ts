import { describe, expect, it, vi, beforeEach } from "vitest";
import { runFullImportExtraction } from "./orchestrator";
import type { ImportSource } from "./chunking";
import type { ImportSection, ImportData } from "@/components/import/types";
import { ConfidenceEntry } from "./ai";
import * as aiMock from "./ai";

vi.mock("./ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./ai")>();
  const callOrder: string[] = [];
  const extractSectionFromChunk = async (params: {
    section: ImportSection;
    sourceId: string;
    chunkIndex: number;
  }) => {
    callOrder.push(`${params.section}:${params.sourceId}:${params.chunkIndex}`);

    if (params.section === "hotels") {
      const confidence: Record<string, ConfidenceEntry> =
        params.sourceId === "s1"
          ? { "hotels[0].name": 0.7 }
          : { "hotels[0].name": { score: 0.9, reason: "duplicate but clearer" } };
      return {
        section: params.section,
        sourceId: params.sourceId,
        chunkIndex: params.chunkIndex,
        partialData: {
          hotels: [
            {
              name: "Scandic Plaza",
              address: "",
              city: "Stockholm",
              country: "Sweden",
              checkInDate: "2025-03-12",
              checkInTime: "",
              checkOutDate: "",
              checkOutTime: "",
              bookingReference: "",
              phone: "",
              email: "",
              notes: "",
            },
          ],
        } as Partial<ImportData>,
        confidenceByField: confidence,
      };
    }

    if (params.section === "deal") {
      const fee = params.sourceId === "s1" ? "100" : "200";
      return {
        section: params.section,
        sourceId: params.sourceId,
        chunkIndex: params.chunkIndex,
        partialData: { deal: { fee, currency: "USD", paymentTerms: "", dealType: "", notes: "" } },
        confidenceByField: { "deal.fee": params.sourceId === "s1" ? 0.8 : 0.95 },
      };
    }

    return {
      section: params.section,
      sourceId: params.sourceId,
      chunkIndex: params.chunkIndex,
      partialData: {},
      confidenceByField: {},
    };
  };

  return {
    ...actual,
    extractSectionFromChunk,
    __callOrder: callOrder,
  };
});

// Access mocked call order
const getCallOrder = () => (aiMock as any).__callOrder as string[] | undefined;

const sources: ImportSource[] = [
  { id: "s1", fileName: "one.txt", rawText: "alpha beta gamma" },
  { id: "s2", fileName: "two.txt", rawText: "delta epsilon zeta" },
];

describe("orchestrator", () => {
  beforeEach(() => {
    const order = getCallOrder();
    if (order) order.length = 0;
  });

  it("processes sections, sources, and chunks in stable order", async () => {
    await runFullImportExtraction(sources);
    const order = getCallOrder();
    expect(order?.slice(0, 6)).toEqual([
      "general:s1:0",
      "general:s2:0",
      "deal:s1:0",
      "deal:s2:0",
      "hotels:s1:0",
      "hotels:s2:0",
    ]);
  });

  it("prefers existing non-empty fields and dedupes hotels keeping highest confidence", async () => {
    const { data, confidenceByField } = await runFullImportExtraction(sources);

    expect(data.deal.fee).toBe("100"); // first non-empty wins
    expect(data.hotels).toHaveLength(1); // deduped
    expect(data.hotels[0].name).toBe("Scandic Plaza");

    const hotelConfidence = confidenceByField["hotels[0].name"];
    expect(hotelConfidence && typeof hotelConfidence === "object" ? hotelConfidence.score : hotelConfidence).toBe(0.9);
    if (typeof hotelConfidence === "object") {
      expect(hotelConfidence.reason).toBe("duplicate but clearer");
    }
  });
});
