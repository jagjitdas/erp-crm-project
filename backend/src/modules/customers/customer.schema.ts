import { z } from 'zod';

const customerTypeEnum = z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']);
const customerStatusEnum = z.enum(['LEAD', 'ACTIVE', 'INACTIVE']);

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name is required'),
    mobile: z.string().min(7, 'Valid mobile number is required'),
    email: z.string().email().optional().or(z.literal('')).optional(),
    businessName: z.string().optional(),
    gstNumber: z.string().optional(),
    customerType: customerTypeEnum,
    address: z.string().optional(),
    status: customerStatusEnum.optional(),
    followUpDate: z.coerce.date().optional(),
    notes: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateCustomerSchema = z.object({
  body: createCustomerSchema.shape.body.partial(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid customer id') }),
});

export const idParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid customer id') }),
});

export const listCustomersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    status: customerStatusEnum.optional(),
    customerType: customerTypeEnum.optional(),
  }),
  params: z.object({}).optional(),
});

export const addFollowUpSchema = z.object({
  body: z.object({
    note: z.string().min(1, 'Note is required'),
    followUpOn: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid customer id') }),
});
