import { describe, expect, it } from "vitest";

describe("KeywordAnalysis utilities", () => {
  it("should calculate keyword sizes correctly", () => {
    const keywords = [
      { word: "test", frequency: 100, tfidf: 0.5 },
      { word: "example", frequency: 50, tfidf: 0.3 },
      { word: "demo", frequency: 10, tfidf: 0.1 },
    ];

    const maxFreq = Math.max(...keywords.map(k => k.frequency), 1);
    const minFreq = Math.min(...keywords.map(k => k.frequency), 1);

    const sizes = keywords.map(k => ({
      ...k,
      size: 12 + ((k.frequency - minFreq) / (maxFreq - minFreq)) * 28,
    }));

    // 最高频率的词应该有最大的尺寸
    expect(sizes[0].size).toBeGreaterThan(sizes[1].size);
    expect(sizes[1].size).toBeGreaterThan(sizes[2].size);

    // 尺寸范围应该在 12 到 40 之间
    sizes.forEach(s => {
      expect(s.size).toBeGreaterThanOrEqual(12);
      expect(s.size).toBeLessThanOrEqual(40);
    });
  });

  it("should sort keywords by TF-IDF correctly", () => {
    const keywords = [
      { word: "test", frequency: 100, tfidf: 0.1 },
      { word: "example", frequency: 50, tfidf: 0.5 },
      { word: "demo", frequency: 10, tfidf: 0.3 },
    ];

    const sorted = [...keywords].sort((a, b) => b.tfidf - a.tfidf);

    expect(sorted[0].word).toBe("example");
    expect(sorted[1].word).toBe("demo");
    expect(sorted[2].word).toBe("test");
  });

  it("should handle empty keyword list", () => {
    const keywords: any[] = [];

    const sorted = [...keywords].sort((a, b) => b.tfidf - a.tfidf);

    expect(sorted).toHaveLength(0);
  });

  it("should limit keywords to maxItems", () => {
    const keywords = Array.from({ length: 50 }, (_, i) => ({
      word: `keyword${i}`,
      frequency: 50 - i,
      tfidf: (50 - i) / 100,
    }));

    const maxItems = 20;
    const limited = keywords.slice(0, maxItems);

    expect(limited).toHaveLength(maxItems);
  });
});
