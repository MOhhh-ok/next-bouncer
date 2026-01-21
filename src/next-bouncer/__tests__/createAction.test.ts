import { describe, expect, test } from "bun:test";
import { z } from "zod";
import type { ValidationAdapter } from "../adaptors/validations/validationAdaptor";
import { zodValidation } from "../adaptors/validations/zod";
import { createAction } from "../createAction";
import type { Result } from "../types";

describe("createAction", () => {
  test("should execute action with valid input", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        return {
          ok: true,
          data: {
            message: `Hello ${params.name}, you are ${params.age} years old`,
          },
        };
      },
    });

    const result = await action({
      input: { name: "Alice", age: 30 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.message).toBe("Hello Alice, you are 30 years old");
    }
  });

  test("should return error on validation failure", async () => {
    const schema = z.object({
      email: z.string().email(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async () => {
        return { ok: true, data: { success: true } };
      },
    });

    const result = await action({
      input: { email: "invalid-email" },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    }
  });

  test("should handle handler errors", async () => {
    const schema = z.object({
      id: z.number(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        if (params.id === 999) {
          return {
            ok: false,
            error: "ID not found",
          };
        }
        return { ok: true, data: { id: params.id } };
      },
    });

    const result = await action({
      input: { id: 999 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("ID not found");
    }
  });

  test("should work with coercion", async () => {
    const schema = z.object({
      count: z.coerce.number(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        // paramsのcountは数値として推論される
        return {
          ok: true,
          data: { doubled: params.count * 2 },
        };
      },
    });

    const result = await action({
      input: { count: "42" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.doubled).toBe(84);
    }
  });

  test("should handle complex nested validation", async () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      settings: z.object({
        notifications: z.boolean(),
        theme: z.enum(["light", "dark"]),
      }),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        return {
          ok: true,
          data: {
            userName: params.user.name,
            userEmail: params.user.email,
            theme: params.settings.theme,
          },
        };
      },
    });

    const result = await action({
      input: {
        user: {
          name: "Bob",
          email: "bob@example.com",
        },
        settings: {
          notifications: true,
          theme: "dark",
        },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userName).toBe("Bob");
      expect(result.data.userEmail).toBe("bob@example.com");
      expect(result.data.theme).toBe("dark");
    }
  });

  test("should work with custom validation adapter", async () => {
    const customValidator: ValidationAdapter<
      { value: string },
      { value: string; processed: boolean }
    > = {
      parse: async (input: unknown) => {
        if (
          typeof input === "object"
          && input !== null
          && "value" in input
          && typeof input.value === "string"
        ) {
          return {
            ok: true,
            data: { value: input.value, processed: true },
          };
        }
        return {
          ok: false,
          error: { message: "Invalid custom input" },
        };
      },
    };

    const action = createAction({
      validation: customValidator,
      handler: async (params) => {
        return {
          ok: true,
          data: {
            result: `${params.value} - processed: ${params.processed}`,
          },
        };
      },
    });

    const result = await action({
      input: { value: "test" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.result).toBe("test - processed: true");
    }
  });

  test("should handle async handler operations", async () => {
    const schema = z.object({
      delay: z.number(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        await new Promise((resolve) => setTimeout(resolve, params.delay));
        return {
          ok: true,
          data: { completed: true, delayUsed: params.delay },
        };
      },
    });

    const startTime = Date.now();
    const result = await action({
      input: { delay: 50 },
    });
    const endTime = Date.now();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.completed).toBe(true);
      expect(result.data.delayUsed).toBe(50);
    }
    expect(endTime - startTime).toBeGreaterThanOrEqual(50);
  });

  test("should handle empty result data", async () => {
    const schema = z.object({
      action: z.string(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async () => {
        return { ok: true, data: undefined };
      },
    });

    const result = await action({
      input: { action: "delete" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeUndefined();
    }
  });

  test("should preserve type safety for ResultData generic", async () => {
    const schema = z.object({
      id: z.number(),
    });

    type CustomResultData = {
      userId: number;
      userName: string;
      metadata: {
        createdAt: string;
      };
    };

    const action = createAction<
      z.input<typeof schema>,
      z.output<typeof schema>,
      CustomResultData
    >({
      validation: zodValidation(schema),
      handler: async (params) => {
        return {
          ok: true,
          data: {
            userId: params.id,
            userName: "User" + params.id,
            metadata: {
              createdAt: new Date().toISOString(),
            },
          },
        };
      },
    });

    const result = await action({
      input: { id: 123 },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.userId).toBe(123);
      expect(result.data.userName).toBe("User123");
      expect(result.data.metadata.createdAt).toBeDefined();
    }
  });

  test("should handle array validation", async () => {
    const schema = z.object({
      items: z.array(z.string()),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        return {
          ok: true,
          data: {
            count: params.items.length,
            items: params.items.map((item) => item.toUpperCase()),
          },
        };
      },
    });

    const result = await action({
      input: { items: ["apple", "banana", "cherry"] },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.count).toBe(3);
      expect(result.data.items).toEqual(["APPLE", "BANANA", "CHERRY"]);
    }
  });

  test("should reject missing required fields", async () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });

    const action = createAction({
      validation: zodValidation(schema),
      handler: async () => {
        return { ok: true, data: { success: true } };
      },
    });

    const result = await action({
      // @ts-ignore
      input: { optional: "value" },
    });

    expect(result.ok).toBe(false);
  });

  test("should work with z.any() schema", async () => {
    const schema = z.any();

    const action = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        return {
          ok: true,
          data: { received: params },
        };
      },
    });

    const result = await action({
      input: { anything: "goes", number: 42, nested: { value: true } },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.received).toEqual({
        anything: "goes",
        number: 42,
        nested: { value: true },
      });
    }
  });
});
