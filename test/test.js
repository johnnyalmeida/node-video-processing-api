import test from 'ava';
import request from 'supertest';
import app from '../src/app';

test('GET / | should be ok', async (t) => {
  t.plan(2);

  const res = await request(app)
    .get('/');

  t.is(res.status, 200);
  t.is(res.text, 'ok');
});

test('POST /video | should process a video file', async (t) => {
  t.plan(2);

  const key = 'a846794f-9b35-442e-a250-f8cef0dcd999';

  const res = await request(app)
    .post('/video')
    .send({
      key,
    });

  t.is(res.status, 200);
  t.is(res.text, '{"success":true}');
});
