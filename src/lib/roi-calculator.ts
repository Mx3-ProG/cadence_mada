export type RoiInputs = {
  appointmentsPerWeek: number;
  averageValue: number;
};

const WEEKS_PER_MONTH = 4.33;

function clampPositive(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Weekly professional time scheduled through the calendar, in currency units. */
export function estimateWeeklyScheduledValue(inputs: RoiInputs): number {
  return Math.round(clampPositive(inputs.appointmentsPerWeek) * clampPositive(inputs.averageValue));
}

/** Same estimate projected over a month (illustrative only, see landing disclaimer). */
export function estimateMonthlyScheduledValue(inputs: RoiInputs): number {
  return Math.round(estimateWeeklyScheduledValue(inputs) * WEEKS_PER_MONTH);
}
