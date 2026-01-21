import z from "zod";
import { PermissionAdaptor } from "./adaptors/permissions/permissionAdaptor";
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
  getActor: (a: { params: Output }) => Promise<Actor | undefined>;
  permission: PermissionAdaptor<Actor, Output>;
  handler: (a: {
    params: Output;
    actor: Actor | undefined;
  }) => Promise<Result<ResultData>>;
};

export function createAction<
  Input,
  Output,
  ResultData = unknown,
  Actor = unknown,
>(config: ActionConfig<Input, Output, ResultData, Actor>) {
  const { validation, handler, getActor, permission } = config;

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

    // パーミッションチェック
    if (permission) {
      const permissionResult = await permission({ actor, params: parsed.data });

      if (!permissionResult.permitted) {
        return {
          ok: false,
          error: "Permission denied",
        } as Result<ResultData>;
      }
    }

    // ハンドラー実行
    return await handler({
      params: parsed.data,
      actor,
    });
  };
}

if (import.meta.main) {
  const test = createAction({
    validation: zodValidation(z.object({ a: z.coerce.number() })),
    getActor: async ({ params }) => {
      console.log("getting actor", params);
      return { userId: "test-user" };
    },
    permission: async ({ actor, params }) => {
      return { permitted: false };
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
