import { z } from 'zod';

export const createChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid('Valid customer is required'),
    status: z.enum(['DRAFT', 'CONFIRMED']).optional(), // Cancelled is only reachable via the cancel endpoint
    items: z
      .array(
        z.object({
          productId: z.string().uuid('Valid product is required'),
          quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
        })
      )
      .min(1, 'At least one product line is required'),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const idParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid challan id') }),
});

export const listChallansSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELLED']).optional(),
    customerId: z.string().uuid().optional(),
  }),
  params: z.object({}).optional(),
});

export const updateChallanSchema = z.object({
  body: z.object({
    customerId: z.string().uuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.coerce.number().int().positive(),
        })
      )
      .min(1)
      .optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid challan id') }),
});
