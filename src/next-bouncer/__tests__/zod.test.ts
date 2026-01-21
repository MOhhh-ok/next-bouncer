import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { zodValidation } from "../adaptors/validations/zod";

describe("createZodValidation", () => {
  test("should validate simple string schema", async () => {
    const schema = z.string();
    const validator = zodValidation(schema);

    const result = await validator.parse("hello");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBe("hello");
    }
  });

  test("should fail on invalid string input", async () => {
    const schema = z.string();
    const validator = zodValidation(schema);

    const result = await validator.parse(123);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBeDefined();
      expect(result.error.issues).toBeDefined();
    }
  });

  test("should validate object schema", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const validator = zodValidation(schema);

    const result = await validator.parse({ name: "Alice", age: 30 });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Alice");
      expect(result.data.age).toBe(30);
    }
  });

  test("should fail on invalid object schema", async () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const validator = zodValidation(schema);

    const result = await validator.parse({ name: "Alice", age: "thirty" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBeDefined();
      expect(result.error.issues?.length).toBeGreaterThan(0);
    }
  });

  test("should handle coercion with z.coerce", async () => {
    const schema = z.object({
      id: z.coerce.number(),
    });
    const validator = zodValidation(schema);

    const result = await validator.parse({ id: "123" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.id).toBe(123);
      expect(typeof result.data.id).toBe("number");
    }
  });

  test("should validate nested objects", async () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
        email: z.string().email(),
      }),
      metadata: z.object({
        createdAt: z.string(),
      }),
    });
    const validator = zodValidation(schema);

    const validInput = {
      user: {
        name: "Bob",
        email: "bob@example.com",
      },
      metadata: {
        createdAt: "2024-01-01",
      },
    };

    const result = await validator.parse(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.name).toBe("Bob");
      expect(result.data.user.email).toBe("bob@example.com");
    }
  });

  test("should validate arrays", async () => {
    const schema = z.array(z.number());
    const validator = zodValidation(schema);

    const result = await validator.parse([1, 2, 3]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([1, 2, 3]);
    }
  });

  test("should fail on invalid array items", async () => {
    const schema = z.array(z.number());
    const validator = zodValidation(schema);

    const result = await validator.parse([1, "two", 3]);

    expect(result.ok).toBe(false);
  });

  test("should handle optional fields", async () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const validator = zodValidation(schema);

    const result = await validator.parse({ required: "value" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.required).toBe("value");
      expect(result.data.optional).toBeUndefined();
    }
  });

  test("should handle default values", async () => {
    const schema = z.object({
      name: z.string(),
      role: z.string().default("user"),
    });
    const validator = zodValidation(schema);

    const result = await validator.parse({ name: "Charlie" });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Charlie");
      expect(result.data.role).toBe("user");
    }
  });

  test("should validate with refinements", async () => {
    const schema = z.object({
      password: z.string().min(8),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords must match",
    });
    const validator = zodValidation(schema);

    const resultValid = await validator.parse({
      password: "password123",
      confirmPassword: "password123",
    });

    expect(resultValid.ok).toBe(true);

    const resultInvalid = await validator.parse({
      password: "password123",
      confirmPassword: "different",
    });

    expect(resultInvalid.ok).toBe(false);
    if (!resultInvalid.ok) {
      expect(resultInvalid.error.message).toContain("match");
    }
  });

  test("should preserve error message from first issue", async () => {
    const schema = z.object({
      email: z.string().email("Invalid email format"),
    });
    const validator = zodValidation(schema);

    const result = await validator.parse({ email: "not-an-email" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe("Invalid email format");
    }
  });

  test("should handle union types", async () => {
    const schema = z.union([z.string(), z.number()]);
    const validator = zodValidation(schema);

    const resultString = await validator.parse("hello");
    expect(resultString.ok).toBe(true);

    const resultNumber = await validator.parse(42);
    expect(resultNumber.ok).toBe(true);

    const resultInvalid = await validator.parse(true);
    expect(resultInvalid.ok).toBe(false);
  });

  test("should handle async validation", async () => {
    const schema = z.string().refine(
      async (val) => {
        // 非同期バリデーションをシミュレート
        await new Promise((resolve) => setTimeout(resolve, 10));
        return val.length > 5;
      },
      { message: "String must be longer than 5 characters" },
    );
    const validator = zodValidation(schema);

    const resultValid = await validator.parse("hello world");
    expect(resultValid.ok).toBe(true);

    const resultInvalid = await validator.parse("hi");
    expect(resultInvalid.ok).toBe(false);
  });
});
