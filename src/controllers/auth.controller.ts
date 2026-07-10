import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RegisterSchema, LoginSchema } from '../dtos/auth.dto';

const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
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
    
    const token = generateToken(newUser._id.toString());
    
    res.status(201).json({ token, user: { id: newUser._id.toString(), name, email } });
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

    const token = generateToken(user._id.toString());
    
    res.status(200).json({ token, user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
};