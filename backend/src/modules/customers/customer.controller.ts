import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../utils/ApiError';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination, buildPaginationMeta } from '../../utils/pagination';

// POST /customers
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json({ success: true, data: customer });
});

// GET /customers  (search + filter + pagination)
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const { page, pageSize, skip, take } = getPagination(req);
  const { search, status, customerType } = req.query as {
    search?: string;
    status?: string;
    customerType?: string;
  };

  const where: Prisma.CustomerWhereInput = {
    ...(status ? { status: status as any } : {}),
    ...(customerType ? { customerType: customerType as any } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { businessName: { contains: search, mode: 'insensitive' } },
            { gstNumber: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);

  res.status(200).json({
    success: true,
    data: items,
    meta: buildPaginationMeta(total, page, pageSize),
  });
});

// GET /customers/:id
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      followUps: { orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { name: true } } } },
      challans: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) throw ApiError.notFound('Customer not found');
  res.status(200).json({ success: true, data: customer });
});

// PUT /customers/:id
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const exists = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!exists) throw ApiError.notFound('Customer not found');

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.status(200).json({ success: true, data: customer });
});

// DELETE /customers/:id
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const exists = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!exists) throw ApiError.notFound('Customer not found');

  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(200).json({ success: true, message: 'Customer deleted' });
});

// POST /customers/:id/follow-ups
export const addFollowUp = asyncHandler(async (req: Request, res: Response) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) throw ApiError.notFound('Customer not found');

  const { note, followUpOn } = req.body;

  const followUp = await prisma.$transaction(async (tx) => {
    const fu = await tx.followUp.create({
      data: {
        customerId: customer.id,
        note,
        followUpOn,
        createdById: req.user?.userId,
      },
    });
    // Keep the customer's headline follow-up date in sync if a new one was provided
    if (followUpOn) {
      await tx.customer.update({ where: { id: customer.id }, data: { followUpDate: followUpOn } });
    }
    return fu;
  });

  res.status(201).json({ success: true, data: followUp });
});
