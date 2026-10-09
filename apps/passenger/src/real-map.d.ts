declare module '*.mjs' {
  export function renderJourneyMap(
    container: HTMLElement,
    journey: unknown,
    options?: Record<string, unknown>,
  ): Promise<unknown>;

  export function destroyRealMap(container: HTMLElement): void;
}
