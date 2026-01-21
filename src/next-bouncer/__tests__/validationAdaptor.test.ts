import { describe, expect, test } from "bun:test";
import type { ValidationAdapter } from "../adaptors/validations/validationAdaptor";

describe("ValidationAdapter", () => {
  test("should have correct type structure", () => {
    // 型チェックのためのダミー実装
    const mockAdapter: ValidationAdapter<{ input: string }, { output: number }> = {
      parse: async (input: unknown) => {
        if (typeof input === "object" && input !== null && "input" in input) {
          return { ok: true, data: { output: 123 } };
        }
        return {
          ok: false,
          error: { message: "Invalid input" },
        };
      },
    };

    expect(mockAdapter.parse).toBeDefined();
  });

  test("should return success result on valid input", async () => {
    const mockAdapter: ValidationAdapter<string, number> = {
      parse: async (input: unknown) => {
        if (typeof input === "string") {
          return { ok: true, data: parseInt(input, 10) };
        }
        return {
          ok: false,
          error: { message: "Expected string" },
        };
      },
    };

    const result = await mockAdapter.parse("42");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe(42);
    }
  });

  test("should return error result on invalid input", async () => {
    const mockAdapter: ValidationAdapter<string, number> = {
      parse: async (input: unknown) => {
        if (typeof input === "string") {
          return { ok: true, data: parseInt(input, 10) };
        }
        return {
          ok: false,
          error: { message: "Expected string", issues: ["input must be string"] },
        };
      },
    };

    const result = await mockAdapter.parse(123);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Expected string");
      expect(result.error.issues).toBeDefined();
    }
  });

  test("should handle async operations", async () => {
    const mockAdapter: ValidationAdapter<string, string> = {
      parse: async (input: unknown) => {
        // 非同期処理をシミュレート
        await new Promise((resolve) => setTimeout(resolve, 10));

        if (typeof input === "string") {
          return { ok: true, data: input.toUpperCase() };
        }
        return {
          ok: false,
          error: { message: "Invalid" },
        };
      },
    };

    const result = await mockAdapter.parse("hello");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("HELLO");
    }
  });
});
