import { z } from 'zod';
import { IncidentType } from '../enums/IncidentType.js';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export function calculateHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  let endMinutes = endH * 60 + endM;
  if (endMinutes < startMinutes) {
    // Over midnight shift
    endMinutes += 24 * 60;
  }
  const diffMinutes = endMinutes - startMinutes;
  return Number((diffMinutes / 60).toFixed(2));
}

export const IncidentBaseSchema = z.object({
  id: z.string().optional(),
  workCenterId: z.string({ required_error: 'errWorkCenterRequired' }).min(1, 'errWorkCenterRequired'),
  periodYear: z.number().int().min(2000).max(2100),
  periodMonth: z.number().int().min(1).max(12),
  workerId: z.string({ required_error: 'errWorkerRequired' }).min(1, 'errWorkerRequired'),
  type: z.nativeEnum(IncidentType, { errorMap: () => ({ message: 'errInvalidIncidentType' }) }),
  startDate: z.string().regex(dateRegex, 'errInvalidDateFormat'),
  endDate: z.string().regex(dateRegex, 'errInvalidDateFormat'),
  isRange: z.boolean().default(false),
  startTime: z.string().regex(timeRegex, 'errInvalidTimeFormat').nullable().optional(),
  endTime: z.string().regex(timeRegex, 'errInvalidTimeFormat').nullable().optional(),
  totalHours: z.number().nonnegative().nullable().optional(),
  substitutedWorkerId: z.string().nullable().optional(),
  observations: z.string().max(500, 'errObservationsTooLong').nullable().optional(),
  createdBy: z.string().optional()
});

export const IncidentInputSchema = IncidentBaseSchema.superRefine((data, ctx) => {
  // Rule 1: End date must not be before start date
  if (data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'errEndDateBeforeStartDate',
      path: ['endDate']
    });
  }

  // Rule 2: If type is SUBSTITUTION or OVERTIME, startTime and endTime are required
  const requiresTime = data.type === IncidentType.SUBSTITUTION || data.type === IncidentType.OVERTIME;
  if (requiresTime) {
    if (!data.startTime || !timeRegex.test(data.startTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errStartTimeRequired',
        path: ['startTime']
      });
    }
    if (!data.endTime || !timeRegex.test(data.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errEndTimeRequired',
        path: ['endTime']
      });
    }
    if (data.startTime && data.endTime && data.startTime === data.endTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errStartEndTimeEqual',
        path: ['endTime']
      });
    }
  }

  // Rule 3: If type is SUBSTITUTION, substitutedWorkerId is strictly required
  if (data.type === IncidentType.SUBSTITUTION) {
    if (!data.substitutedWorkerId || data.substitutedWorkerId.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errSubstitutedWorkerRequired',
        path: ['substitutedWorkerId']
      });
    } else if (data.substitutedWorkerId === data.workerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'errCannotSubstituteSelf',
        path: ['substitutedWorkerId']
      });
    }
  }
});

export type IncidentInput = z.infer<typeof IncidentInputSchema>;
