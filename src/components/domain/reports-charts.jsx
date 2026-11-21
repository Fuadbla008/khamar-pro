"use client";

import { chartColor } from "@/lib/reports/constants";
import { formatMoney, toBanglaDigits } from "@/lib/utils/format";

const BAR_WIDTH = 720;
const BAR_HEIGHT = 220;
const PAD_LEFT = 12;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 30;

export function MonthlyBarChart({ monthly = [], banglaDigits = false }) {
  const values = monthly.flatMap((month) => [Number(month.income), Number(month.expense)]);
  const max = Math.max(1, ...values);
  const plotHeight = BAR_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const groupWidth = (BAR_WIDTH - PAD_LEFT - PAD_RIGHT) / Math.max(monthly.length, 1);
  const barWidth = Math.max(4, (groupWidth - 10) / 2);
  const baseline = BAR_HEIGHT - PAD_BOTTOM;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-1" /> আয়
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-5" /> খরচ
        </span>
      </div>
      <svg
        viewBox={`0 0 ${BAR_WIDTH} ${BAR_HEIGHT}`}
        className="h-56 w-full"
        role="img"
        aria-label="গত ১২ মাসের আয় ও খরচ"
        preserveAspectRatio="none"
      >
        {[0.25, 0.5, 0.75, 1].map((step) => (
          <line
            key={step}
            x1={PAD_LEFT}
            x2={BAR_WIDTH - PAD_RIGHT}
            y1={baseline - plotHeight * step}
            y2={baseline - plotHeight * step}
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        {monthly.map((month, index) => {
          const x = PAD_LEFT + index * groupWidth + 5;
          const incomeHeight = (Number(month.income) / max) * plotHeight;
          const expenseHeight = (Number(month.expense) / max) * plotHeight;
          return (
            <g key={month.key}>
              <rect
                x={x}
                y={baseline - incomeHeight}
                width={barWidth}
                height={incomeHeight}
                rx="2"
                fill="var(--chart-1)"
              >
                <title>{`${month.label} · আয় ${formatMoney(month.income, { banglaDigits })}`}</title>
              </rect>
              <rect
                x={x + barWidth + 2}
                y={baseline - expenseHeight}
                width={barWidth}
                height={expenseHeight}
                rx="2"
                fill="var(--chart-5)"
              >
                <title>{`${month.label} · খরচ ${formatMoney(month.expense, { banglaDigits })}`}</title>
              </rect>
              <text
                x={x + barWidth}
                y={BAR_HEIGHT - 8}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted-foreground)"
              >
                {month.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const PIE_RADIUS = 58;
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS;

export function ExpensePieChart({ slices = [], banglaDigits = false }) {
  const total = slices.reduce((sum, slice) => sum + Number(slice.amount), 0);
  const segments = slices.map((slice, index) => {
    const length = (slice.percent / 100) * PIE_CIRCUMFERENCE;
    const start = slices
      .slice(0, index)
      .reduce((sum, item) => sum + (item.percent / 100) * PIE_CIRCUMFERENCE, 0);
    return { ...slice, length, start };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg
        viewBox="0 0 160 160"
        className="size-40 shrink-0"
        role="img"
        aria-label="খরচের ক্যাটাগরি অনুযায়ী ভাগ"
      >
        <circle
          cx="80"
          cy="80"
          r={PIE_RADIUS}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="22"
        />
        <g transform="rotate(-90 80 80)">
          {segments.map((slice, index) => {
            const { length, start } = slice;
            return (
              <circle
                key={`${slice.code}-${index}`}
                cx="80"
                cy="80"
                r={PIE_RADIUS}
                fill="none"
                stroke={chartColor(index)}
                strokeWidth="22"
                strokeDasharray={`${length} ${PIE_CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
              >
                <title>{`${slice.label} · ${formatMoney(slice.amount, { banglaDigits })}`}</title>
              </circle>
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" fontSize="11" fill="var(--muted-foreground)">
          মোট খরচ
        </text>
        <text x="80" y="94" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--foreground)">
          {formatMoney(total, { banglaDigits })}
        </text>
      </svg>

      <ul className="w-full space-y-2 text-sm">
        {slices.length ? (
          slices.map((slice, index) => (
            <li key={`${slice.code}-${index}`} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: chartColor(index) }} />
              <span className="min-w-0 flex-1 truncate">{slice.label}</span>
              <span className="shrink-0 tabular-nums">{formatMoney(slice.amount, { banglaDigits })}</span>
              <span className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                {banglaDigits
                  ? toBanglaDigits(slice.percent.toFixed(1))
                  : slice.percent.toFixed(1)}
                %
              </span>
            </li>
          ))
        ) : (
          <li className="text-xs text-muted-foreground">এই সময়সীমায় কোনো খরচ নেই।</li>
        )}
      </ul>
    </div>
  );
}
