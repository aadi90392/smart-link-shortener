import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { Link } from '../models/Link';
import { CreateLinkSchema } from '../dtos/link.dto';
import { AuthRequest } from '../middlewares/auth.middleware';

export const createShortLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsedBody = CreateLinkSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.flatten().fieldErrors });
      return;
    }

    const { originalUrl } = parsedBody.data;
    const shortId = nanoid(8); 

    const newLink = await Link.create({
      originalUrl,
      shortId,
      userId: req.user?.id, 
    });

    res.status(201).json({ 
      message: 'Short link created successfully', 
      link: newLink 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating link' });
  }
};


export const redirectLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const { shortId } = req.params;
    
    const link = await Link.findOne({ shortId });
    if (!link) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

  
    link.clicks += 1;
    await link.save();

   
    res.redirect(link.originalUrl);
  } catch (error) {
    res.status(500).json({ error: 'Server error during redirect' });
  }
};

export const getUserLinks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id; 
    
    const links = await Link.find({ userId }).sort({ createdAt: -1 }); 
    
    res.status(200).json({ links });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching links' });
  }
};