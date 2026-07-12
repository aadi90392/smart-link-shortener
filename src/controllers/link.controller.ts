import { Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { Link } from '../models/Link';
import { ClickEvent } from '../models/ClickEvent';
import { CreateLinkSchema } from '../dtos/link.dto';
import { AuthRequest } from '../middlewares/auth.middleware';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { UAParser } from 'ua-parser-js';

const linkCache = new LRUCache<string, { url: string, id: string }>({ 
  max: 500, 
  ttl: 1000 * 60 * 5 
});

export const createShortLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const parsedBody = CreateLinkSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.flatten().fieldErrors });
      return;
    }

    const { originalUrl, customAlias, expiresAt } = parsedBody.data;
    let attempts = 0;
    const maxAttempts = 3;
    let newLink;

    while (attempts < maxAttempts) {
      try {
        const shortId = customAlias || nanoid(8); 
        newLink = await Link.create({
          originalUrl,
          shortId,
          customAlias,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          userId: req.user?.id, 
        });
        break; 
      } catch (error: any) {
        if (error.code === 11000) {
          if (customAlias) {
            res.status(400).json({ error: 'Custom alias already exists. Please try another.' });
            return;
          }
          attempts++;
          if (attempts === maxAttempts) {
            throw new Error("Failed to generate unique ID after multiple attempts");
          }
          continue; 
        }
        throw error; 
      }
    }
    res.status(201).json({ message: 'Short link created successfully', link: newLink });
  } catch (error) {
    res.status(500).json({ error: 'Server error while creating link' });
  }
};

export const redirectLink = async (req: Request, res: Response): Promise<void> => {
  try {
    const shortId = req.params.shortId as string;
    let cachedData = linkCache.get(shortId);

    if (!cachedData) {
      const link = await Link.findOne({ 
        $or: [{ shortId: shortId }, { customAlias: shortId }],
        isActive: true 
      });

      if (!link) {
        res.status(410).json({ error: 'Link has expired, deactivated, or does not exist' });
        return;
      }
      
      cachedData = { url: link.originalUrl, id: link._id.toString() };
      linkCache.set(shortId, cachedData);

      link.clicks += 1;
      link.save().catch(err => console.error(err));
    } else {
      Link.updateOne({ _id: cachedData.id }, { $inc: { clicks: 1 } })
          .catch(err => console.error(err));
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rawUA = req.headers['user-agent'] || 'Unknown';
    const referrer = req.headers['referer'] || 'Direct';

    const parser = new UAParser(rawUA);
    const browserName = parser.getBrowser().name || 'Unknown';
    const osName = parser.getOS().name || 'Unknown';
    const meaningfulDeviceString = `${browserName} (${osName})`;

    const ipHash = crypto.createHash('sha256').update(String(ip)).digest('hex');

    ClickEvent.create({
      linkId: cachedData.id,
      referrer,
      userAgent: meaningfulDeviceString, 
      ipHash,
    }).catch(err => console.error(err));

    res.redirect(302, cachedData.url);
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

export const updateLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; 
    const parsedBody = CreateLinkSchema.safeParse(req.body); 
    
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.flatten().fieldErrors });
      return;
    }

    const { originalUrl, customAlias, expiresAt } = parsedBody.data;

    const link = await Link.findOne({ _id: id, userId: req.user?.id });
    if (!link) {
      res.status(404).json({ error: 'Link not found or unauthorized' });
      return;
    }

    link.originalUrl = originalUrl;
    if (customAlias) link.customAlias = customAlias;
    if (expiresAt) link.expiresAt = new Date(expiresAt);
    
    await link.save();

    linkCache.delete(link.shortId);
    if (link.customAlias) linkCache.delete(link.customAlias);

    res.status(200).json({ message: 'Link updated successfully', link });
  } catch (error: any) {
    if (error.code === 11000) {
       res.status(400).json({ error: 'Custom alias already in use.' });
       return;
    }
    res.status(500).json({ error: 'Server error while updating link' });
  }
};

export const deleteLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params; 
    const link = await Link.findOneAndDelete({ _id: id, userId: req.user?.id });
    if (!link) {
      res.status(404).json({ error: 'Link not found or unauthorized' });
      return;
    }

    linkCache.delete(link.shortId);
    if (link.customAlias) linkCache.delete(link.customAlias);

    res.status(200).json({ message: 'Link deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error while deleting link' });
  }
};

export const getLinkAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { range } = req.query; 

    const link = await Link.findOne({ _id: id, userId: req.user?.id });
    if (!link) {
      res.status(404).json({ error: 'Link not found or unauthorized' });
      return;
    }

    const matchStage: any = { linkId: link._id };

    if (range && typeof range === 'string') {
      const days = parseInt(range.replace('d', ''));
      if (!isNaN(days)) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        matchStage.timestamp = { $gte: startDate }; 
      }
    }

    const clicksOverTime = await ClickEvent.aggregate([
      { $match: matchStage },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const topReferrers = await ClickEvent.aggregate([
      { $match: matchStage },
      { $group: { _id: "$referrer", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const devices = await ClickEvent.aggregate([
      { $match: matchStage },
      { $group: { _id: "$userAgent", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.status(200).json({ totalClicks: link.clicks, clicksOverTime, topReferrers, devices });
  } catch (error) {
    res.status(500).json({ error: 'Server error while fetching analytics' });
  }
};