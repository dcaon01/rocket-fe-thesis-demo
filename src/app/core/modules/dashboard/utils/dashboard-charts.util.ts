import type { EChartsOption } from 'echarts';
import { ChartTheme } from '../../../utils/chart-theme.util';

/** VAT rate applied to the net revenue to show the gross one: the revenue records carry only the net amount. */
export const VAT_RATE_PERCENT = 22;

/** Short Italian names of the months, January first. */
const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/**
 * Formats a chart value the Italian way: ECharts would write 30,000 and 2.5 whatever the language of the app.
 * @param value the value.
 * @returns the formatted value.
 */
export function formatChartNumber(value: number): string {
  return value.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

/**
 * Formats a chart value in euro, the Italian way.
 * @param value the amount in euro.
 * @returns the formatted amount.
 */
export function formatChartEuro(value: number): string {
  return '€ ' + formatChartNumber(value);
}

/**
 * Formats a latency: in milliseconds below one second, in seconds from there, so 29938 reads 29,9 s.
 * @param ms the latency in milliseconds.
 * @returns the formatted latency.
 */
export function formatLatency(ms: number): string {
  return ms < 1000
    ? `${Math.round(ms).toLocaleString('it-IT')} ms`
    : `${(ms / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} s`;
}

/**
 * Adapts a value formatter to the tooltip, whose value is absent on a gap of the line.
 * @param format the value formatter.
 * @returns the tooltip formatter.
 */
export function tooltipValue(format: (value: number) => string): (value: unknown) => string {
  return value => typeof value === 'number' ? format(value) : '-';
}

/**
 * Builds an ECharts line chart option.
 * @param chart the chart colors.
 * @param categories the x-axis category labels.
 * @param seriesList the series data to plot; a null value leaves a gap in the line.
 * @param format the formatter of the values, on the y-axis and in the tooltip.
 * @returns the ECharts option object.
 */
export function buildLineOption(
  chart: ChartTheme,
  categories: string[],
  seriesList: { name: string; data: (number | null)[] }[],
  format: (value: number) => string = formatChartNumber,
): EChartsOption {
  return {
    color: chart.palette,
    tooltip: {
      ...chart.tooltip,
      trigger: 'axis',
      valueFormatter: tooltipValue(format)
    },
    legend: seriesList.length > 1 ? { bottom: 0, textStyle: { color: chart.text } } : undefined,
    grid: { left: '3%', right: '4%', bottom: seriesList.length > 1 ? '15%' : '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: chart.text, rotate: categories.length > 6 ? 30 : 0 },
      axisLine: { lineStyle: { color: chart.axisLine } }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: chart.text,
        formatter: format
      },
      splitLine: { lineStyle: { color: chart.splitLine } }
    },
    series: seriesList.map(s => ({
      name: s.name,
      type: 'line' as const,
      data: s.data,
      smooth: true,
      lineStyle: { width: 2.5 },
      symbolSize: 6,
      areaStyle: seriesList.length === 1 ? { opacity: 0.12 } : undefined
    }))
  };
}

/**
 * Builds an ECharts doughnut pie chart option.
 * @param chart the chart colors.
 * @param data the pie chart data (name/value pairs).
 * @returns the ECharts option object.
 */
export function buildPieOption(chart: ChartTheme, data: { name: string; value: number }[]): EChartsOption {
  // Without values the ring stays empty, with the same message as the bars in its middle.
  const slices = data.filter(slice => slice.value > 0);
  const isEmpty = slices.length === 0;

  return {
    color: chart.palette,
    tooltip: {
      ...chart.tooltip,
      trigger: 'item',
      formatter: params => {
        const { name, value, percent } = params as { name: string; value: number; percent: number };
        return `${name}: ${formatChartNumber(value)} (${formatChartNumber(percent)}%)`;
      }
    },
    title: isEmpty
      ? { text: 'Nessun dato nel periodo', left: 'center', top: 'middle', textStyle: { color: chart.text, fontSize: 14, fontWeight: 'normal' } }
      : undefined,
    series: [{
      type: 'pie',
      radius: ['45%', '72%'],
      itemStyle: { borderRadius: 6, borderColor: chart.surface, borderWidth: 2 },
      emptyCircleStyle: { color: chart.splitLine },
      data: slices,
      label: { color: chart.text },
      labelLine: { lineStyle: { color: chart.axisLine } }
    }]
  };
}

/**
 * Builds an ECharts vertical bar chart option.
 * @param chart the chart colors.
 * @param categories the x-axis category labels.
 * @param values the bar values.
 * @param labelsFromEnd whether a long axis labels every other category counting from the last, so the current period
 * always has its label.
 * @returns the ECharts option object.
 */
export function buildBarOption(chart: ChartTheme, categories: string[], values: (number | null)[], labelsFromEnd = false): EChartsOption {
  // Without bars the value axis has no range: a fixed one keeps the grid, with the empty message on it.
  const isEmpty = values.every(value => value === null);

  return {
    color: chart.palette,
    tooltip: { ...chart.tooltip, trigger: 'axis', valueFormatter: tooltipValue(formatChartNumber) },
    title: isEmpty
      ? { text: 'Nessun dato nel periodo', left: 'center', top: 'middle', textStyle: { color: chart.text, fontSize: 14, fontWeight: 'normal' } }
      : undefined,
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        color: chart.text,
        ...(labelsFromEnd && categories.length > 6 && { interval: (index: number) => (categories.length - 1 - index) % 2 === 0 }),
      },
      axisLine: { lineStyle: { color: chart.axisLine } }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      ...(isEmpty && { min: 0, max: 1 }),
      axisLabel: { color: chart.text, formatter: formatChartNumber },
      splitLine: { lineStyle: { color: chart.splitLine } }
    },
    series: [{ type: 'bar', data: values, barWidth: '50%', itemStyle: { borderRadius: [6, 6, 0, 0] } }]
  };
}

/**
 * Builds an ECharts horizontal stacked bar option: one bar per category, split into its parts.
 * @param chart the chart colors.
 * @param categories the categories, one bar each, listed from the top.
 * @param seriesList the parts of every bar, each with its color and one value per category.
 * @returns the ECharts option object.
 */
export function buildStackedBarOption(
  chart: ChartTheme,
  categories: string[],
  seriesList: { name: string; color: string; data: number[] }[],
): EChartsOption {
  return {
    tooltip: { ...chart.tooltip, trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: tooltipValue(formatChartNumber) },
    legend: { bottom: 0, textStyle: { color: chart.text } },
    grid: { left: '3%', right: '4%', top: '3%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'value',
      minInterval: 1,
      axisLabel: { color: chart.text, formatter: formatChartNumber },
      splitLine: { lineStyle: { color: chart.splitLine } }
    },
    yAxis: {
      type: 'category',
      data: categories,
      inverse: true,
      axisLabel: { color: chart.text },
      axisLine: { lineStyle: { color: chart.axisLine } }
    },
    // The surface border keeps a thin gap between the parts of a bar.
    series: seriesList.map(s => ({
      name: s.name,
      type: 'bar' as const,
      stack: 'total',
      data: s.data,
      barWidth: '50%',
      itemStyle: { color: s.color, borderColor: chart.surface, borderWidth: 2 },
    }))
  };
}

/**
 * Returns the periods of a chart axis: the last 12 months, or the last 5 years, the current one included.
 * @param isMonthly true for months, false for years.
 * @returns the month indexes (YYYY-MM) or the years (YYYY), oldest first.
 */
export function periodKeys(isMonthly: boolean): string[] {
  const now = new Date();
  if (!isMonthly) {
    return Array.from({ length: 5 }, (_, index) => String(now.getFullYear() - 4 + index));
  }

  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

/**
 * Formats a monthIndex string (e.g. "2026-03") into an Italian label (e.g. "Mar 2026").
 * @param monthIndex the month index in YYYY-MM format, or a year.
 * @returns the formatted label string.
 */
export function formatMonthIndex(monthIndex: string): string {
  const parts = monthIndex.split('-');
  if (parts.length === 1) {
    return parts[0];
  }

  return `${MONTH_NAMES[parseInt(parts[1], 10) - 1]} ${parts[0]}`;
}

/**
 * Animates the values of metric cards with a count-up effect: each value increments from 0 to its target over
 * 500ms (30 steps), formatted with the card's prefix, decimals and suffix.
 * @param cards the cards.
 * @param display the displayed values, updated in place.
 */
export function animateCards(cards: { value: number; prefix: string; decimals: number; suffix?: string }[], display: string[]): void {
  const duration = 500;
  const steps = 30;
  const interval = duration / steps;

  cards.forEach((card, index) => {
    let current = 0;
    const increment = card.value / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= card.value) {
        current = card.value;
        clearInterval(timer);
      }
      display[index] = card.prefix + current.toLocaleString('it-IT', {
        minimumFractionDigits: card.decimals,
        maximumFractionDigits: card.decimals
      }) + (card.suffix ?? '');
    }, interval);
  });
}
