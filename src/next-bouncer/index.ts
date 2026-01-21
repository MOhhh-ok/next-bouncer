import z from "zod";
import { createZodValidation } from "./adaptors/zod";
import { Result } from "./types";
import { ValidationAdapter } from "./validationAdaptor";

type ActionConfig<
  Schema,
  Input,
  ResultData,
> = {
  validation: ValidationAdapter<Schema, Input>;
  schema: Schema;
  handler: (params: Input) => Promise<Result<ResultData>>;
};

export function createAction<
  Schema,
  Input,
  ResultData = unknown,
>(config: ActionConfig<Schema, Input, ResultData>) {
  const { validation, schema, handler } = config;

  return async (params: { input: unknown }) => {
    // バリデーション実行
    const parsed = await validation.parse(schema, params.input);

    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error.message,
      } as Result<ResultData>;
    }

    // ハンドラー実行
    return await handler(parsed.data);
  };
}

if (import.meta.main) {
  (async () => {
    const schema = z.object({ b: z.string() });

    const test = createAction({
      validation: createZodValidation(schema),
      schema,
      handler: (input) => {
        // ここで input は { b: string } として推論される
        console.log(input.b);
        return Promise.resolve({ ok: true, data: {} });
      },
    });

    console.log("start");
    const res = await test({ input: {} });
    console.log(res);
  })();
}
