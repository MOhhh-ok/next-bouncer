import { describe, expect, test } from "bun:test";
import type { Result } from "../types";

describe("Result type", () => {
  test("should accept success result with data", () => {
    const successResult: Result<string> = {
      ok: true,
      data: "success",
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data).toBe("success");
    }
  });

  test("should accept error result with string error", () => {
    const errorResult: Result<string> = {
      ok: false,
      error: "Something went wrong",
    };

    expect(errorResult.ok).toBe(false);
    if (!errorResult.ok) {
      expect(errorResult.error).toBe("Something went wrong");
    }
  });

  test("should work with complex data types", () => {
    type UserData = {
      id: number;
      name: string;
      email: string;
    };

    const successResult: Result<UserData> = {
      ok: true,
      data: {
        id: 1,
        name: "Alice",
        email: "alice@example.com",
      },
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data.id).toBe(1);
      expect(successResult.data.name).toBe("Alice");
      expect(successResult.data.email).toBe("alice@example.com");
    }
  });

  test("should work with custom error types", () => {
    type CustomError = {
      code: number;
      message: string;
    };

    const errorResult: Result<string, CustomError> = {
      ok: false,
      error: {
        code: 404,
        message: "Not found",
      },
    };

    expect(errorResult.ok).toBe(false);
    if (!errorResult.ok) {
      expect(errorResult.error.code).toBe(404);
      expect(errorResult.error.message).toBe("Not found");
    }
  });

  test("should handle undefined data", () => {
    const successResult: Result<undefined> = {
      ok: true,
      data: undefined,
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data).toBeUndefined();
    }
  });

  test("should handle null data", () => {
    const successResult: Result<null> = {
      ok: true,
      data: null,
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data).toBeNull();
    }
  });

  test("should work with array data", () => {
    const successResult: Result<number[]> = {
      ok: true,
      data: [1, 2, 3, 4, 5],
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data).toEqual([1, 2, 3, 4, 5]);
      expect(successResult.data.length).toBe(5);
    }
  });

  test("should work with nested objects", () => {
    type NestedData = {
      user: {
        profile: {
          name: string;
          age: number;
        };
      };
      metadata: {
        createdAt: string;
      };
    };

    const successResult: Result<NestedData> = {
      ok: true,
      data: {
        user: {
          profile: {
            name: "Bob",
            age: 25,
          },
        },
        metadata: {
          createdAt: "2024-01-01",
        },
      },
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data.user.profile.name).toBe("Bob");
      expect(successResult.data.user.profile.age).toBe(25);
      expect(successResult.data.metadata.createdAt).toBe("2024-01-01");
    }
  });

  test("should be discriminated by ok property", () => {
    const result: Result<string> = Math.random() > 0.5
      ? { ok: true, data: "success" }
      : { ok: false, error: "failure" };

    if (result.ok) {
      // TypeScriptの型ガードにより、ここではdataプロパティが存在することが保証される
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe("string");
    } else {
      // TypeScriptの型ガードにより、ここではerrorプロパティが存在することが保証される
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    }
  });

  test("should work with union types for data", () => {
    const successResult: Result<string | number> = {
      ok: true,
      data: "text",
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(typeof successResult.data === "string" || typeof successResult.data === "number").toBe(true);
    }
  });

  test("should handle empty object as data", () => {
    const successResult: Result<Record<string, never>> = {
      ok: true,
      data: {},
    };

    expect(successResult.ok).toBe(true);
    if (successResult.ok) {
      expect(successResult.data).toEqual({});
    }
  });
});
