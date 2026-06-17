/* eslint-disable @typescript-eslint/no-explicit-any */
export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window !== "undefined") {
    (window as any).umami?.track(event, props);
  }
}
