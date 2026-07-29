import { Router } from 'express';
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  recordStockMovement,
} from './product.controller';
import {
  createProductSchema,
  updateProductSchema,
  idParamSchema,
  listProductsSchema,
  stockMovementSchema,
} from './product.schema';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listProductsSchema), listProducts);
router.get('/:id', validate(idParamSchema), getProduct);

// Admin and Warehouse manage the product catalogue
router.post('/', requireRole('ADMIN', 'WAREHOUSE'), validate(createProductSchema), createProduct);
router.put('/:id', requireRole('ADMIN', 'WAREHOUSE'), validate(updateProductSchema), updateProduct);
router.delete('/:id', requireRole('ADMIN'), validate(idParamSchema), deleteProduct);

// Stock movements (manual IN/OUT, e.g. purchase receipt, damage, correction)
router.post(
  '/:id/stock-movements',
  requireRole('ADMIN', 'WAREHOUSE'),
  validate(stockMovementSchema),
  recordStockMovement
);

export default router;
