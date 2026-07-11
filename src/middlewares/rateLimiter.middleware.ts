import rateLimit from 'express-rate-limit';


export const createLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { 
    error: 'Too many links created from this IP. Please try again after 15 minutes.' 
  },
  standardHeaders: true, 
  legacyHeaders: false,
});