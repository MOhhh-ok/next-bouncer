import z, { ZodType } from "zod";
import { ValidationAdapter } from "./validationAdaptor";

// Zodスキーマから型安全なValidationAdapterを作成
// スキーマをクロージャに保持することで、parseメソッドでschemaパラメータが不要に
// z.input<T>でinput型を、z.output<T>でoutput型を推論
export function createZodValidation<T extends ZodType>(
  schema: T,
): ValidationAdapter<z.input<T>, z.output<T>> {
  return {
    parse: async (input: unknown) => {
      const result = await schema.safeParseAsync(input);

      if (result.success) {
        return { ok: true as const, data: result.data as z.output<T> };
      }

      return {
        ok: false as const,
        error: {
          message: result.error.issues[0]?.message ?? "Validation failed",
          issues: result.error.issues,
        },
      };
    },
  };
}
