import { createShortLink } from '../src/controllers/link.controller';
import { Link } from '../src/models/Link';
jest.mock('../src/models/Link');

describe('Core Logic: Nanoid Collision Retry', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    req = {
      body: { originalUrl: 'https://example.com' },
      user: { id: 'mock-user-id' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    jest.clearAllMocks();
  });

  it('should retry generation if a duplicate key error (11000) occurs', async () => {
    const mockCreate = Link.create as jest.Mock;
   
    mockCreate
      .mockRejectedValueOnce({ code: 11000 }) 
      .mockResolvedValueOnce({ originalUrl: 'https://example.com', shortId: 'successID' }); 

    await createShortLink(req as any, res as any);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Short link created successfully'
    }));
  });

  it('should fail immediately on custom alias collision', async () => {
    req.body.customAlias = 'my-alias';
    const mockCreate = Link.create as jest.Mock;
    

    mockCreate.mockRejectedValueOnce({ code: 11000 });

    await createShortLink(req as any, res as any);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: 'Custom alias already exists. Please try another.'
    }));
  });
});