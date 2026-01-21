import { Result } from "../../types";

// コアの型定義 - InputとOutputの型推論をサポート
export interface ValidationAdapter<Input = any, Output = Input> {
  // パース関数（スキーマは内包される）
  parse: (
    input: unknown,
  ) => Promise<
    | { ok: true; data: Output }
    | { ok: false; error: { message: string; issues?: any[] } }
  >;
}

// スキーマから入力型を推論するヘルパー型
export type InferInput<VAdapter> = VAdapter extends ValidationAdapter<
  infer Input,
  any
> ? Input
  : never;

// スキーマから出力型を推論するヘルパー型
export type InferOutput<VAdapter> = VAdapter extends ValidationAdapter<
  any,
  infer Output
> ? Output
  : never;
