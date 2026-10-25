import mongoose from 'mongoose';

// Disable automatic index builds globally in test environments to eliminate
// MongoDB index-build contention, lock queueing, and timeouts during test execution.
process.env.NODE_ENV = 'test';
delete process.env.CUSTOMER_APP_URL;
mongoose.set('autoIndex', false);
