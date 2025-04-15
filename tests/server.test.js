const request = require('supertest');
const app = require('../server'); // Đảm bảo đường dẫn chính xác đến server

describe('Test API', () => {
  it('Should return a list of movies', async () => {
    const res = await request(app).get('/api/movies');
    expect(res.statusCode).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
});