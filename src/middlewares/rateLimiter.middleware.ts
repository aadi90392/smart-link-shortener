import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth.middleware';

export const createLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  keyGenerator: (req) => {
    return (req as AuthRequest).user?.id || req.ip || 'unknown'; 
  },
  message: { 
    error: 'Too many links created from this account. Please try again after 15 minutes.' 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});