import { describe, expect, test } from "bun:test";
import { z } from "zod";
import type { ValidationAdapter } from "../adaptors/validations/validationAdaptor";
import { zodValidation } from "../adaptors/validations/zod";
import { createAction } from "../createAction";

describe("Integration Tests", () => {
  test("should handle end-to-end user registration flow", async () => {
    const registrationSchema = z.object({
      username: z.string().min(3).max(20),
      email: z.string().email(),
      password: z.string().min(8),
      age: z.coerce.number().min(18),
    });

    const registerAction = createAction({
      validation: zodValidation(registrationSchema),
      handler: async (params) => {
        // データベース保存のシミュレーション
        const user = {
          id: Math.floor(Math.random() * 1000),
          username: params.username,
          email: params.email,
          age: params.age,
          createdAt: new Date().toISOString(),
        };

        return {
          ok: true,
          data: { user },
        };
      },
    });

    const result = await registerAction({
      input: {
        username: "johndoe",
        email: "john@example.com",
        password: "securePassword123",
        age: "25",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.username).toBe("johndoe");
      expect(result.data.user.email).toBe("john@example.com");
      expect(result.data.user.age).toBe(25);
      expect(result.data.user.id).toBeDefined();
      expect(result.data.user.createdAt).toBeDefined();
    }
  });

  test("should handle complex business logic with multiple validations", async () => {
    const orderSchema = z.object({
      items: z.array(
        z.object({
          productId: z.string(),
          quantity: z.number().min(1),
          price: z.number().positive(),
        }),
      ).min(1),
      shippingAddress: z.object({
        street: z.string(),
        city: z.string(),
        zipCode: z.string().regex(/^\d{5}$/),
      }),
      paymentMethod: z.enum(["credit_card", "paypal", "bank_transfer"]),
    });

    const createOrderAction = createAction({
      validation: zodValidation(orderSchema),
      handler: async (params) => {
        // 合計金額計算
        const totalAmount = params.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        // 在庫確認のシミュレーション
        const allInStock = params.items.every((item) => item.quantity <= 100);

        if (!allInStock) {
          return {
            ok: false,
            error: "Some items are out of stock",
          };
        }

        return {
          ok: true,
          data: {
            orderId: `ORD-${Date.now()}`,
            totalAmount,
            itemCount: params.items.length,
            shippingAddress: params.shippingAddress,
            paymentMethod: params.paymentMethod,
            status: "pending",
          },
        };
      },
    });

    const result = await createOrderAction({
      input: {
        items: [
          { productId: "PROD-001", quantity: 2, price: 29.99 },
          { productId: "PROD-002", quantity: 1, price: 49.99 },
        ],
        shippingAddress: {
          street: "123 Main St",
          city: "Tokyo",
          zipCode: "12345",
        },
        paymentMethod: "credit_card",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.totalAmount).toBe(109.97);
      expect(result.data.itemCount).toBe(2);
      expect(result.data.status).toBe("pending");
      expect(result.data.orderId).toMatch(/^ORD-\d+$/);
    }
  });

  test("should chain multiple actions", async () => {
    const createUserSchema = z.object({
      email: z.string().email(),
      name: z.string(),
    });

    const verifyUserSchema = z.object({
      userId: z.number(),
      token: z.string(),
    });

    const createUser = createAction({
      validation: zodValidation(createUserSchema),
      handler: async (params) => {
        const userId = Math.floor(Math.random() * 1000);
        const token = `TOKEN-${userId}-${Date.now()}`;

        return {
          ok: true,
          data: { userId, token, email: params.email },
        };
      },
    });

    const verifyUser = createAction({
      validation: zodValidation(verifyUserSchema),
      handler: async (params) => {
        // トークン検証のシミュレーション
        const isValidToken = params.token.startsWith(`TOKEN-${params.userId}`);

        if (!isValidToken) {
          return {
            ok: false,
            error: "Invalid token",
          };
        }

        return {
          ok: true,
          data: { verified: true, userId: params.userId },
        };
      },
    });

    // ユーザー作成
    const createResult = await createUser({
      input: { email: "test@example.com", name: "Test User" },
    });

    expect(createResult.ok).toBe(true);

    if (createResult.ok) {
      // ユーザー検証
      const verifyResult = await verifyUser({
        input: {
          userId: createResult.data.userId,
          token: createResult.data.token,
        },
      });

      expect(verifyResult.ok).toBe(true);
      if (verifyResult.ok) {
        expect(verifyResult.data.verified).toBe(true);
        expect(verifyResult.data.userId).toBe(createResult.data.userId);
      }
    }
  });

  test("should handle custom validation adapter with business rules", async () => {
    type UserInput = {
      username: string;
      role: string;
    };

    type UserOutput = {
      username: string;
      role: "admin" | "user" | "guest";
      permissions: string[];
    };

    const customUserValidator: ValidationAdapter<UserInput, UserOutput> = {
      parse: async (input: unknown) => {
        if (typeof input !== "object" || input === null) {
          return {
            ok: false,
            error: { message: "Input must be an object" },
          };
        }

        const data = input as Record<string, unknown>;

        if (typeof data.username !== "string" || data.username.length < 3) {
          return {
            ok: false,
            error: { message: "Username must be at least 3 characters" },
          };
        }

        if (typeof data.role !== "string") {
          return {
            ok: false,
            error: { message: "Role must be a string" },
          };
        }

        const normalizedRole = data.role.toLowerCase();
        const validRoles = ["admin", "user", "guest"];

        if (!validRoles.includes(normalizedRole)) {
          return {
            ok: false,
            error: { message: "Invalid role" },
          };
        }

        const permissions = normalizedRole === "admin"
          ? ["read", "write", "delete"]
          : normalizedRole === "user"
          ? ["read", "write"]
          : ["read"];

        return {
          ok: true,
          data: {
            username: data.username,
            role: normalizedRole as "admin" | "user" | "guest",
            permissions,
          },
        };
      },
    };

    const createUserAction = createAction({
      validation: customUserValidator,
      handler: async (params) => {
        return {
          ok: true,
          data: {
            user: {
              username: params.username,
              role: params.role,
              permissions: params.permissions,
            },
          },
        };
      },
    });

    const result = await createUserAction({
      input: { username: "admin_user", role: "ADMIN" },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.user.username).toBe("admin_user");
      expect(result.data.user.role).toBe("admin");
      expect(result.data.user.permissions).toEqual(["read", "write", "delete"]);
    }
  });

  test("should handle error recovery patterns", async () => {
    const dataSchema = z.object({
      value: z.number(),
    });

    let attemptCount = 0;

    const unreliableAction = createAction({
      validation: zodValidation(dataSchema),
      handler: async (params) => {
        attemptCount++;

        // 最初の2回は失敗する
        if (attemptCount < 3) {
          return {
            ok: false,
            error: `Attempt ${attemptCount} failed`,
          };
        }

        return {
          ok: true,
          data: { result: params.value * 2, attempts: attemptCount },
        };
      },
    });

    // リトライロジック
    let result;
    let retries = 0;
    const maxRetries = 5;

    do {
      result = await unreliableAction({ input: { value: 10 } });
      retries++;
    } while (!result.ok && retries < maxRetries);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.result).toBe(20);
      expect(result.data.attempts).toBe(3);
    }
    expect(retries).toBe(3);
  });

  test("should handle concurrent actions", async () => {
    const schema = z.object({
      id: z.number(),
    });

    const fetchAction = createAction({
      validation: zodValidation(schema),
      handler: async (params) => {
        // 非同期処理のシミュレーション
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

        return {
          ok: true,
          data: { id: params.id, name: `Item ${params.id}` },
        };
      },
    });

    // 複数のアクションを同時実行
    const results = await Promise.all([
      fetchAction({ input: { id: 1 } }),
      fetchAction({ input: { id: 2 } }),
      fetchAction({ input: { id: 3 } }),
      fetchAction({ input: { id: 4 } }),
      fetchAction({ input: { id: 5 } }),
    ]);

    expect(results).toHaveLength(5);
    results.forEach((result, index) => {
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(index + 1);
        expect(result.data.name).toBe(`Item ${index + 1}`);
      }
    });
  });

  test("should handle validation with transformation pipeline", async () => {
    const pipelineSchema = z.object({
      email: z.string().email().transform((val) => val.toLowerCase()),
      birthdate: z.string().transform((val) => new Date(val)),
      tags: z.string().transform((val) => val.split(",").map((t) => t.trim())),
    });

    const processUserAction = createAction({
      validation: zodValidation(pipelineSchema),
      handler: async (params) => {
        const age = Math.floor(
          (Date.now() - params.birthdate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
        );

        return {
          ok: true,
          data: {
            email: params.email,
            age,
            tags: params.tags,
            processedAt: new Date().toISOString(),
          },
        };
      },
    });

    const result = await processUserAction({
      input: {
        email: "USER@EXAMPLE.COM",
        birthdate: "1990-01-01",
        tags: "developer, typescript, react",
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.age).toBeGreaterThan(30);
      expect(result.data.tags).toEqual(["developer", "typescript", "react"]);
      expect(result.data.processedAt).toBeDefined();
    }
  });
});
