import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { createApp } from '../index.js';
import { connectDB } from '../config/db.js';

test('Health and Readiness Endpoints', async (t) => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  await t.test('GET /health responds in under 100ms without requiring DB', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/health`);
    const duration = Date.now() - start;
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(duration < 100, `Expected /health under 100ms, took ${duration}ms`);
  });

  await t.test('GET /api/health responds in under 100ms', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/health`);
    const duration = Date.now() - start;
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(duration < 100, `Expected /api/health under 100ms, took ${duration}ms`);
  });

  await t.test('GET /ready returns 503 when MongoDB is not connected', async () => {
    if (mongoose.connection.readyState !== 1) {
      const res = await fetch(`${baseUrl}/ready`);
      const body = await res.json();
      assert.equal(res.status, 503);
      assert.equal(body.status, 'unavailable');
      assert.equal(body.database, 'disconnected');
    }
  });

  await t.test('GET /ready returns 200 when MongoDB is connected and ping succeeds', async () => {
    if (process.env.MONGO_URI) {
      await connectDB();
      const res = await fetch(`${baseUrl}/ready`);
      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.status, 'ok');
      assert.equal(body.database, 'connected');
    }
  });

  await t.test('Wrong password on /api/auth/login fails immediately with 401', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_test_user@example.com', password: 'wrongpassword' }),
    });
    const duration = Date.now() - start;
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.ok(body.error);
    assert.ok(duration < 5000, `Wrong password took too long: ${duration}ms`);
  });

  await t.test('Wrong password on /api/platform/admin/login fails immediately with 401', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/platform/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'superadmin_wrong@example.com', password: 'wrongpassword' }),
    });
    const duration = Date.now() - start;
    const body = await res.json();

    assert.equal(res.status, 401);
    assert.ok(body.error);
    assert.ok(duration < 5000, `Wrong superadmin password took too long: ${duration}ms`);
  });
});
