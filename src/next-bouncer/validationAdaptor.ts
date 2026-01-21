import { Result } from "./types";

// コアの型定義 - 型推論をサポート
export interface ValidationAdapter<Schema = any, Output = any> {
  // パース関数
  parse: (
    schema: Schema,
    input: unknown,
  ) => Promise<
    | { ok: true; data: Output }
    | { ok: false; error: { message: string; issues?: any[] } }
  >;
}

// スキーマから出力型を推論するヘルパー型
export type InferOutput<VAdapter> = VAdapter extends ValidationAdapter<
  any,
  infer Output
> ? Output
  : never;
