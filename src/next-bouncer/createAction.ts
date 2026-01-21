import z from "zod";
import { ValidationAdapter } from "./adaptors/validations/validationAdaptor";
import { zodValidation } from "./adaptors/validations/zod";
import { Result } from "./types";

type ActionConfig<
  Input,
  Output,
  ResultData,
> = {
  validation: ValidationAdapter<Input, Output>;
  handler: (params: Output) => Promise<Result<ResultData>>;
};

export function createAction<
  Input,
  Output,
  ResultData = unknown,
>(config: ActionConfig<Input, Output, ResultData>) {
  const { validation, handler } = config;

  return async (params: { input: Input }) => {
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
    const schema = z.object({ b: z.coerce.number() });

    const test = createAction({
      validation: zodValidation(schema),
      handler: (input) => {
        // ここで input は { b: number } として推論される（output型）
        console.log(input.b);
        return Promise.resolve({ ok: true, data: { ddd: 456 } });
      },
    });

    console.log("start");
    // input型は { b: string | number } として推論される
    const res = await test({ input: { b: "123" } });
    console.log(res);
  })();
}
