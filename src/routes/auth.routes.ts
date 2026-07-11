import { Router } from 'express';
import { register, login, refreshAccessToken } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshAccessToken);

export default router;