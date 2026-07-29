import { Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, buildPaginationMeta } from '../../utils/pagination';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

// Generates a challan number like CH-20260729-0001, unique per day.
// Wrapped in a small retry loop to tolerate a rare race between the count and the insert.
async function generateChallanNumber(tx: TxClient): Promise<string> {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
  const startOfDay = new Date(today.toISOString().slice(0, 10));
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const countToday = await tx.challan.count({
    where: { createdAt: { gte: startOfDay, lt: endOfDay } },
  });

  const sequence = String(countToday + 1).padStart(4, '0');
  return `CH-${datePart}-${sequence}`;
}

// Validates products exist/are active and returns line items with snapshot data + computed totals.
async function buildChallanItems(
  tx: TxClient,
  items: { productId: string; quantity: number }[]
) {
  const productIds = items.map((i) => i.productId);
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  let totalQuantity = 0;
  const lineItems = items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw ApiError.badRequest(`Product with id ${item.productId} does not exist`);
    }
    if (!product.isActive) {
      throw ApiError.badRequest(`Product "${product.name}" is inactive and cannot be sold`);
    }
    totalQuantity += item.quantity;
    const lineTotal = Number(product.unitPrice) * item.quantity;
    return {
      productId: product.id,
      productNameSnapshot: product.name,
      skuSnapshot: product.sku,
      unitPriceSnapshot: product.unitPrice,
      quantity: item.quantity,
      lineTotal,
    };
  });

  return { lineItems, totalQuantity, productMap };
}

// Reduces stock for each item, throwing if any product would go negative.
// Assumes it is called inside a $transaction so partial failure rolls back everything.
async function reduceStockForItems(
  tx: TxClient,
  items: { productId: string; quantity: number }[],
  productMap: Map<string, { name: string; currentStock: number }>,
  challanNumber: string,
  createdById?: string
) {
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const newStock = product.currentStock - item.quantity;
    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock for "${product.name}". Available: ${product.currentStock}, requested: ${item.quantity}`
      );
    }
    await tx.product.update({ where: { id: item.productId }, data: { currentStock: newStock } });
    await tx.stockMovement.create({
      data: {
        productId: item.productId,
        quantity: item.quantity,
        movementType: 'OUT',
        reason: 'Sales challan confirmed',
        reference: challanNumber,
        createdById,
      },
    });
  }
}

// POST /challans
export const createChallan = asyncHandler(async (req: Request, res: Response) => {
  const { customerId, items, status } = req.body as {
    customerId: string;
    items: { productId: string; quantity: number }[];
    status?: 'DRAFT' | 'CONFIRMED';
  };
  const desiredStatus = status || 'DRAFT';

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw ApiError.badRequest('Customer does not exist');

  const challan = await prisma.$transaction(async (tx) => {
    const { lineItems, totalQuantity, productMap } = await buildChallanItems(tx, items);
    const challanNumber = await generateChallanNumber(tx);

    const created = await tx.challan.create({
      data: {
        challanNumber,
        customerId,
        totalQuantity,
        status: 'DRAFT',
        createdById: req.user?.userId,
        items: { create: lineItems },
      },
      include: { items: true, customer: true },
    });

    // If the caller wants it confirmed immediately, reduce stock now within the same transaction
    if (desiredStatus === 'CONFIRMED') {
      await reduceStockForItems(tx, items, productMap, challanNumber, req.user?.userId);
      return tx.challan.update({
        where: { id: created.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        include: { items: true, customer: true },
      });
    }

    return created;
  });

  res.status(201).json({ success: true, data: challan });
});

// GET /challans
export const listChallans = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, skip, take } = getPagination(req);
  const { status, customerId } = req.query as { status?: string; customerId?: string };

  const where: Prisma.ChallanWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(customerId ? { customerId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true, mobile: true } }, items: true },
    }),
    prisma.challan.count({ where }),
  ]);

  res.status(200).json({ success: true, data: items, meta: buildPaginationMeta(total, page, pageSize) });
});

// GET /challans/:id
export const getChallan = asyncHandler(async (req: Request, res: Response) => {
  const challan = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      items: { include: { product: { select: { name: true, sku: true, currentStock: true } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!challan) throw ApiError.notFound('Challan not found');
  res.status(200).json({ success: true, data: challan });
});

// PUT /challans/:id  (only editable while in DRAFT)
export const updateChallan = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id } });
  if (!existing) throw ApiError.notFound('Challan not found');
  if (existing.status !== 'DRAFT') {
    throw ApiError.badRequest(`Only DRAFT challans can be edited. Current status: ${existing.status}`);
  }

  const { customerId, items } = req.body as {
    customerId?: string;
    items?: { productId: string; quantity: number }[];
  };

  const challan = await prisma.$transaction(async (tx) => {
    if (items) {
      const { lineItems, totalQuantity } = await buildChallanItems(tx, items);
      await tx.challanItem.deleteMany({ where: { challanId: existing.id } });
      return tx.challan.update({
        where: { id: existing.id },
        data: {
          ...(customerId ? { customerId } : {}),
          totalQuantity,
          items: { create: lineItems },
        },
        include: { items: true, customer: true },
      });
    }
    return tx.challan.update({
      where: { id: existing.id },
      data: { ...(customerId ? { customerId } : {}) },
      include: { items: true, customer: true },
    });
  });

  res.status(200).json({ success: true, data: challan });
});

// POST /challans/:id/confirm  (reduces stock; fails atomically if any line is short)
export const confirmChallan = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.challan.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!existing) throw ApiError.notFound('Challan not found');
  if (existing.status !== 'DRAFT') {
    throw ApiError.badRequest(`Only DRAFT challans can be confirmed. Current status: ${existing.status}`);
  }

  const challan = await prisma.$transaction(async (tx) => {
    const productIds = existing.items.map((i) => i.productId);
    const products = await tx.product.findMany({ where: { id: { in: productIds } } });
    const productMap = new Map(products.map((p) => [p.id, p]));

    await reduceStockForItems(
      tx,
      existing.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      productMap,
      existing.challanNumber,
      req.user?.userId
    );

    return tx.challan.update({
      where: { id: existing.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
      include: { items: true, customer: true },
    });
  });

  res.status(200).json({ success: true, data: challan });
});

// POST /challans/:id/cancel
export const cancelChallan = asyncHandler(async (req: Request, res: Response) => {
  const existing = await prisma.challan.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!existing) throw ApiError.notFound('Challan not found');
  if (existing.status === 'CANCELLED') {
    throw ApiError.badRequest('Challan is already cancelled');
  }

  const wasConfirmed = existing.status === 'CONFIRMED';

  const challan = await prisma.$transaction(async (tx) => {
    // If stock was already deducted (confirmed), restore it on cancellation
    if (wasConfirmed) {
      for (const item of existing.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            movementType: 'IN',
            reason: 'Sales challan cancelled - stock restored',
            reference: existing.challanNumber,
            createdById: req.user?.userId,
          },
        });
      }
    }
    return tx.challan.update({
      where: { id: existing.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { items: true, customer: true },
    });
  });

  res.status(200).json({ success: true, data: challan });
});
