import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RegisterSchema, LoginSchema } from '../dtos/auth.dto';

const generateAccessToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: '15m' });
};


const generateRefreshToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET as string, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedBody = RegisterSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.flatten().fieldErrors });
      return;
    }

    const { name, email, password } = parsedBody.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({ name, email, passwordHash });
 
    const accessToken = generateAccessToken(newUser._id.toString());
    const refreshToken = generateRefreshToken(newUser._id.toString());
    
    res.status(201).json({ 
      accessToken, 
      refreshToken, 
      user: { id: newUser._id.toString(), name, email } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const parsedBody = LoginSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ error: parsedBody.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parsedBody.data;

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    // Generate both tokens
    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
    res.status(200).json({ 
      accessToken, 
      refreshToken, 
      user: { id: user._id.toString(), name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(401).json({ error: 'Refresh token is required' });
      return;
    }

    jwt.verify(token, process.env.JWT_REFRESH_SECRET as string, (err: any, decoded: any) => {
      if (err) {
        res.status(403).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      const newAccessToken = generateAccessToken(decoded.id);
      res.status(200).json({ accessToken: newAccessToken });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error during token refresh' });
  }
};