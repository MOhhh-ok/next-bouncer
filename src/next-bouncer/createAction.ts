import z from "zod";
import { ValidationAdapter } from "./adaptors/validations/validationAdaptor";
import { zodValidation } from "./adaptors/validations/zod";
import { Result } from "./types";

type ActionConfig<
  Input,
  Output,
  ResultData,
  Actor,
> = {
  validation: ValidationAdapter<Input, Output>;
  getActor: (a: { params: Output }) => Promise<Actor>;
  handler: (a: { params: Output; actor: Actor }) => Promise<Result<ResultData>>;
};

export function createAction<
  Input,
  Output,
  ResultData = unknown,
  Actor = unknown,
>(config: ActionConfig<Input, Output, ResultData, Actor>) {
  const { validation, handler, getActor } = config;

  return async (params: Input) => {
    // バリデーション実行
    const parsed = await validation.parse(params);

    if (!parsed.ok) {
      return {
        ok: false,
        error: parsed.error.message,
      } as Result<ResultData>;
    }

    // アクター取得
    const actor = await getActor({ params: parsed.data });

    // ハンドラー実行
    return await handler({ params: parsed.data, actor });
  };
}

if (import.meta.main) {
  const test = createAction({
    validation: zodValidation(z.object({ a: z.coerce.number() })),
    getActor: async ({ params }) => {
      console.log("getting actor", params);
      return { userId: "test-user" };
    },
    handler: async ({ params, actor }) => {
      console.log("running handler", { params, actor });
      return {
        ok: true,
        data: params.a,
      };
    },
  });
  const res = await test({ a: "123" });
  console.log("result", res);
}
