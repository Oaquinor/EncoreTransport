declare module '*.mjs' {
  export function formatMoney(value: number, currency?: string, locale?: string): string;

  export function renderJourneyMap(
    container: HTMLElement,
    journey: unknown,
    options?: Record<string, unknown>,
  ): Promise<unknown>;

  export function destroyRealMap(container: HTMLElement): void;
}
