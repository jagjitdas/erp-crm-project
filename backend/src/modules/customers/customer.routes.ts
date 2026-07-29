import { Router } from 'express';
import {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  deleteCustomer,
  addFollowUp,
} from './customer.controller';
import {
  createCustomerSchema,
  updateCustomerSchema,
  idParamSchema,
  listCustomersSchema,
  addFollowUpSchema,
} from './customer.schema';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

// All customer routes require authentication
router.use(requireAuth);

router.get('/', validate(listCustomersSchema), listCustomers);
router.get('/:id', validate(idParamSchema), getCustomer);

// Sales and Admin can create/edit customers; Warehouse/Accounts are read-only here
router.post('/', requireRole('ADMIN', 'SALES'), validate(createCustomerSchema), createCustomer);
router.put('/:id', requireRole('ADMIN', 'SALES'), validate(updateCustomerSchema), updateCustomer);
router.delete('/:id', requireRole('ADMIN'), validate(idParamSchema), deleteCustomer);

router.post('/:id/follow-ups', requireRole('ADMIN', 'SALES'), validate(addFollowUpSchema), addFollowUp);

export default router;
