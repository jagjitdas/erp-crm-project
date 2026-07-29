import { Router } from 'express';
import { login, register, me } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';
import { validate } from '../../middleware/validate';
import { requireAuth, requireRole } from '../../middleware/auth';

const router = Router();

router.post('/login', validate(loginSchema), login);

// Only an existing Admin can create new employee accounts
router.post('/register', requireAuth, requireRole('ADMIN'), validate(registerSchema), register);

router.get('/me', requireAuth, me);

export default router;
