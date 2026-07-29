import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, buildPaginationMeta } from '../../utils/pagination';

// POST /products
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.create({ data: req.body });
  res.status(201).json({ success: true, data: product });
});

// GET /products
export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, skip, take } = getPagination(req);
  const { search, category, lowStock } = req.query as {
    search?: string;
    category?: string;
    lowStock?: string;
  };

  const where: Prisma.ProductWhereInput = {
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  let items = await prisma.product.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } });
  let total = await prisma.product.count({ where });

  // lowStock filter is computed in-app since it compares two columns
  if (lowStock === 'true') {
    items = items.filter((p) => p.currentStock <= p.minStockAlert);
    total = items.length;
  }

  res.status(200).json({ success: true, data: items, meta: buildPaginationMeta(total, page, pageSize) });
});

// GET /products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { createdBy: { select: { name: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');
  res.status(200).json({ success: true, data: product });
});

// PUT /products/:id
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const exists = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!exists) throw ApiError.notFound('Product not found');

  // Direct stock edits should go through the stock-movement endpoint so there's always
  // an audit trail; block silent stock changes via the generic update route.
  const { currentStock, ...rest } = req.body;

  const product = await prisma.product.update({ where: { id: req.params.id }, data: rest });
  res.status(200).json({ success: true, data: product });
});

// DELETE /products/:id
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const exists = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!exists) throw ApiError.notFound('Product not found');

  await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.status(200).json({ success: true, message: 'Product deactivated' });
});

// POST /products/:id/stock-movements
export const recordStockMovement = asyncHandler(async (req: Request, res: Response) => {
  const { quantity, movementType, reason, reference } = req.body;

  const product = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!product) throw ApiError.notFound('Product not found');

  const delta = movementType === 'IN' ? quantity : -quantity;
  const newStock = product.currentStock + delta;

  if (newStock < 0) {
    throw ApiError.badRequest(
      `Insufficient stock for "${product.name}". Available: ${product.currentStock}, requested OUT: ${quantity}`
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        productId: product.id,
        quantity,
        movementType,
        reason,
        reference,
        createdById: req.user?.userId,
      },
    });
    const updatedProduct = await tx.product.update({
      where: { id: product.id },
      data: { currentStock: newStock },
    });
    return { movement, updatedProduct };
  });

  res.status(201).json({ success: true, data: result });
});
