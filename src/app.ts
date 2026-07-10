import express, {Request, Response} from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/',(req: Request, res: Response)=>{
    res.send('Backend Is Working');
});

export default app;