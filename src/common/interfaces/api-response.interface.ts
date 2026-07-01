export interface ApiSuccessResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}
