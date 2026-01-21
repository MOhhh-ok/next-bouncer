import z from "zod";
import { createZodValidation } from "./adaptors/zod";
import { Result } from "./types";
import { ValidationAdapter } from "./validationAdaptor";

type ActionConfig<
  Input,
  ResultData,
> = {
  validation: ValidationAdapter<Input>;
  handler: (params: Input) => Promise<Result<ResultData>>;
};

export function createAction<
  Input,
  ResultData = unknown,
>(config: ActionConfig<Input, ResultData>) {
  const { validation, handler } = config;

  return async (params: { input: unknown }) => {
    // バリデーション実行
    const parsed = await validation.parse(params.input);

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
      handler: (input) => {
        // ここで input は { b: string } として推論される
        console.log(input.b);
        return Promise.resolve({ ok: true, data: {} });
      },
    });

    console.log("start");
    const res = await test({ input: { abc: "123" } });
    console.log(res);
  })();
}
