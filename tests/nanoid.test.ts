import { nanoid } from 'nanoid';

describe('Core Logic: ID Generation', () => {
  it('should generate a unique 8-character ID', () => {
    const id1 = nanoid(8);
    const id2 = nanoid(8);
    
    expect(id1).toHaveLength(8);
    expect(id2).toHaveLength(8);
    expect(id1).not.toBe(id2);
  });
});