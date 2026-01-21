import { ValidationAdapter } from "./adaptors/validations/validationAdaptor";
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
