import rateLimit from 'express-rate-limit';
import { AuthRequest } from './auth.middleware';

export const createLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  keyGenerator: (req) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    return (req as AuthRequest).user?.id || (clientIp as string); 
  },
  message: { 
    error: 'Too many links created from this account. Please try again after 15 minutes.' 
  },
  standardHeaders: true, 
  legacyHeaders: false,
  validate: false 
});