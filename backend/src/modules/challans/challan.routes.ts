import { Router } from 'express';
import {
  createChallan,
  listChallans,
  getChallan,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from './challan.controller';
import { createChallanSchema, idParamSchema, listChallansSchema, updateChallanSchema } from './challan.schema';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', validate(listChallansSchema), listChallans);
router.get('/:id', validate(idParamSchema), getChallan);

// Sales creates and edits challans; Admin can do everything
router.post('/', requireRole('ADMIN', 'SALES'), validate(createChallanSchema), createChallan);
router.put('/:id', requireRole('ADMIN', 'SALES'), validate(updateChallanSchema), updateChallan);
router.post('/:id/confirm', requireRole('ADMIN', 'SALES', 'WAREHOUSE'), validate(idParamSchema), confirmChallan);
router.post('/:id/cancel', requireRole('ADMIN', 'SALES'), validate(idParamSchema), cancelChallan);

export default router;
