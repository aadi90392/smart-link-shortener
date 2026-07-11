import { Router } from 'express';
import {
    createShortLink,
    redirectLink,
    getUserLinks,
    updateLink,
    deleteLink,
    getLinkAnalytics
} from '../controllers/link.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-links', protect, getUserLinks);
router.post('/create', protect, createShortLink);
router.put('/update/:id', protect, updateLink);
router.delete('/delete/:id', protect, deleteLink);
router.get('/analytics/:id', protect, getLinkAnalytics);


router.get('/:shortId', redirectLink);

export default router;