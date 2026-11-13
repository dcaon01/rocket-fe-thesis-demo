/**
 * Colors for ECharts, read from the CSS tokens.
 */
export interface ChartTheme {
  /** Series colors, in order. */
  palette: string[];

  /** Axis labels, legend and pie labels. */
  text: string;

  /** Axis lines and pie label lines. */
  axisLine: string;

  /** Horizontal grid lines. */
  splitLine: string;

  /** Card surface, used as the gap color between pie slices. */
  surface: string;

  /** Negative values (e.g. non-compliant slices). */
  destructive: string;

  /** Colors of the states, the same dots as the status badges. */
  status: { positive: string; warning: string; negative: string; neutral: string; info: string };

  /** Tooltip styling shared by every chart. */
  tooltip: {
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    padding: number[];
    textStyle: { color: string };
    extraCssText: string;
  };
}

/** Canvas reused to convert CSS colors: ECharts can't parse oklch. */
let _canvasContext: CanvasRenderingContext2D | null = null;

/**
 * Converts any CSS color the browser understands to rgba().
 * @param color the CSS color.
 * @returns the rgba() string.
 */
function toRgba(color: string): string {
  _canvasContext ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!_canvasContext) {
    return color;
  }
  _canvasContext.clearRect(0, 0, 1, 1);
  _canvasContext.fillStyle = color;
  _canvasContext.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = _canvasContext.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`;
}

/**
 * Reads the chart colors from the tokens applied on the document.
 * @returns the chart theme.
 */
export function readChartTheme(): ChartTheme {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => toRgba(style.getPropertyValue(name).trim());

  return {
    palette: [1, 2, 3, 4, 5, 6].map(index => token(`--chart-${index}`)),
    text: token('--muted-foreground'),
    axisLine: token('--border'),
    splitLine: token('--border'),
    surface: token('--card'),
    destructive: token('--destructive'),
    status: {
      positive: token('--status-success-dot'),
      warning: token('--status-warning-dot'),
      negative: token('--status-destructive-dot'),
      neutral: token('--status-neutral-dot'),
      info: token('--status-info-dot'),
    },
    tooltip: {
      backgroundColor: token('--popover'),
      borderColor: token('--border'),
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: token('--popover-foreground') },
      extraCssText: 'border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);'
    }
  };
}
