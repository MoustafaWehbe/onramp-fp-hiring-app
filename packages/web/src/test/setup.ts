import "@testing-library/jest-dom";

/**
 * jsdom implements neither of these, and Recharts' ResponsiveContainer needs
 * both: ResizeObserver to react to its container, and a non-zero
 * getBoundingClientRect to have a box worth drawing into. Without them a
 * chart throws on mount, so every chart test would be asserting on an error
 * boundary rather than on the chart.
 */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

const CHART_TEST_WIDTH = 640;
const CHART_TEST_HEIGHT = 320;

Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value(this: HTMLElement): DOMRect {
    return {
      width: CHART_TEST_WIDTH,
      height: CHART_TEST_HEIGHT,
      top: 0,
      left: 0,
      right: CHART_TEST_WIDTH,
      bottom: CHART_TEST_HEIGHT,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
  },
});
