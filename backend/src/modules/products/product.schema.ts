import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Product name is required'),
    sku: z.string().min(1, 'SKU/code is required'),
    category: z.string().optional(),
    unitPrice: z.coerce.number().positive('Unit price must be positive'),
    currentStock: z.coerce.number().int().min(0).optional(),
    minStockAlert: z.coerce.number().int().min(0).optional(),
    location: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateProductSchema = z.object({
  body: createProductSchema.shape.body.partial(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid product id') }),
});

export const idParamSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid product id') }),
});

export const listProductsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().optional(),
    pageSize: z.string().optional(),
    search: z.string().optional(),
    category: z.string().optional(),
    lowStock: z.string().optional(), // "true" to filter products at/below minStockAlert
  }),
  params: z.object({}).optional(),
});

export const stockMovementSchema = z.object({
  body: z.object({
    quantity: z.coerce.number().int().positive('Quantity must be a positive integer'),
    movementType: z.enum(['IN', 'OUT']),
    reason: z.string().min(1, 'Reason is required'),
    reference: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid('Invalid product id') }),
});
