import { Router } from 'express';
import { createShortLink, redirectLink, getUserLinks } from '../controllers/link.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-links', protect, getUserLinks);
router.post('/create', protect, createShortLink);
router.get('/:shortId', redirectLink);

export default router;