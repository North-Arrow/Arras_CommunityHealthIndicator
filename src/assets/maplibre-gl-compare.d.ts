export default class Compare {
  constructor(
    left: any,
    right: any,
    container: string | HTMLElement,
    opts?: { type?: string; orientation?: string; position?: string[]; showTypeToggle?: boolean }
  );
  onBoth(type: string, fn: () => void): void;
  onceBoth(type: string, fn: () => void): void;
  switchType(type: string): void;
}

