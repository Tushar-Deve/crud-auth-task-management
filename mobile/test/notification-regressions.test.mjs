import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveApiBaseUrl } from '../src/services/api-base-url.ts';
import {
  ASSIGNMENT_NOTIFICATIONS_PATH,
  loadTaskAssignmentNotifications,
  parseTaskAssignmentNotificationResponse,
} from '../src/services/notification-contract.ts';

test('mobile development API uses the Expo host so local task assignments share the web backend', () => {
  assert.equal(
    resolveApiBaseUrl(undefined, true, '192.168.1.25:8081'),
    'http://192.168.1.25:5000',
  );
  assert.equal(resolveApiBaseUrl(undefined, true), 'http://localhost:5000');
  assert.equal(
    resolveApiBaseUrl('https://api.example.test/authRoutes/', true, '192.168.1.25:8081'),
    'https://api.example.test',
  );
  assert.equal(
    resolveApiBaseUrl(undefined, false, '192.168.1.25:8081'),
    'https://crud-auth-task-management.onrender.com',
  );
});

test('mobile assignment notifications consume the backend unread endpoint contract', () => {
  assert.equal(ASSIGNMENT_NOTIFICATIONS_PATH, '/taskRoutes/taskhistory/assignments/unread');

  const notification = {
    id: 41,
    taskId: 12,
    title: 'Review release notes',
    createdAt: '2026-11-14T10:00:00.000Z',
    assigned_by_name: 'Admin',
  };
  assert.deepEqual(
    parseTaskAssignmentNotificationResponse({ success: true, count: 1, notifications: [notification] }),
    { count: 1, notifications: [notification] },
  );
  assert.throws(
    () => parseTaskAssignmentNotificationResponse({ success: true, count: 1 }),
    /invalid assignment notifications/i,
    'a malformed response must remain an error instead of becoming an empty list',
  );
});

test('mobile notification loading preserves authenticated request failures', async () => {
  const authError = Object.assign(new Error('Token expired'), { status: 401 });
  await assert.rejects(
    loadTaskAssignmentNotifications('stale-token', async (path, token) => {
      assert.equal(path, ASSIGNMENT_NOTIFICATIONS_PATH);
      assert.equal(token, 'stale-token');
      throw authError;
    }),
    (error) => error === authError,
  );
});
