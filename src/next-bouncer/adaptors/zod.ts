import z, { ZodType } from "zod";
import { ValidationAdapter } from "../validationAdaptor";

// より型安全なバージョン
export const zodAdapter = {
  infer: null as any,
  parse: async <T extends ZodType>(schema: T, input: unknown) => {
    const result = await schema.safeParseAsync(input);

    if (result.success) {
      return { ok: true as const, data: result.data as z.infer<T> };
    }

    return {
      ok: false as const,
      error: {
        message: result.error.issues[0]?.message ?? "Validation failed",
        issues: result.error.issues,
      },
    };
  },
} as const;

// ヘルパー関数: Zodスキーマから型安全なValidationAdapterを作成
export function createZodValidation<T extends ZodType>(
  schema: T,
): ValidationAdapter<T, z.infer<T>> {
  return {
    parse: async (s: T, input: unknown) => {
      return zodAdapter.parse(s, input);
    },
  };
}
