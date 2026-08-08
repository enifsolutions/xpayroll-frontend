import { AxiosError } from "axios";

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong.",
): string {
  const axiosErr = err as AxiosError<{ error?: string }>;
  return axiosErr.response?.data?.error ?? fallback;
}
