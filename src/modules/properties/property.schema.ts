import { z } from 'zod';

const decimalString = z.string().trim().regex(/^-?(?:\d+(?:\.\d*)?|\.\d+)$/, 'Expected a finite number');

const multipartBoolean = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => {
  return typeof value === 'boolean' ? value : value === 'true';
});

const optionalDate = z.preprocess(
  (value) => (value === '' ? null : value),
  z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid inspectionAt').nullable().optional(),
);

export const createPropertySchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  availableDate: z.string().refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid availableDate'),
  inspectionAt: optionalDate,
  isAvailable: multipartBoolean,
  latitude: decimalString.refine((value) => Number(value) >= -90 && Number(value) <= 90, 'Latitude must be between -90 and 90'),
  longitude: decimalString.refine((value) => Number(value) >= -180 && Number(value) <= 180, 'Longitude must be between -180 and 180'),
  price: decimalString.refine((value) => Number(value) >= 0, 'Price must be greater than or equal to 0'),
  numberOfRooms: z.coerce.number().int().positive(),
});

export const updatePropertySchema = createPropertySchema.partial().extend({
  title: z.string().trim().min(1, 'Title is required').optional(),
  description: z.string().trim().min(1, 'Description is required').optional(),
});

export const propertyIdSchema = z.object({
  id: z.string().uuid('Invalid property id'),
});

export const listPropertyQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(100).optional(),
    isAvailable: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    minPrice: decimalString.refine((value) => Number(value) >= 0, 'minPrice must be greater than or equal to 0').optional(),
    maxPrice: decimalString.refine((value) => Number(value) >= 0, 'maxPrice must be greater than or equal to 0').optional(),
    minRooms: z.coerce.number().int().positive().optional(),
  })
  .refine(
    ({ minPrice, maxPrice }) => minPrice === undefined || maxPrice === undefined || Number(minPrice) <= Number(maxPrice),
    { message: 'minPrice must be less than or equal to maxPrice', path: ['minPrice'] },
  );
