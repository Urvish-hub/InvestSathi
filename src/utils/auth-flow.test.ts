import test from 'node:test';
import assert from 'node:assert/strict';

// Helper validator replicating Register component logic
function validateRegistrationForm({ fullName, email, password, confirmPassword }: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const trimmedName = fullName.trim();
  if (!trimmedName) {
    return { valid: false, error: 'Please enter your full name.' };
  }
  if (trimmedName.length < 2) {
    return { valid: false, error: 'Full name must be at least 2 characters long.' };
  }

  const trimmedEmail = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }

  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters long.' };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' };
  }

  return { valid: true, error: null };
}

// Helper evaluating Supabase signUp response
function evaluateSignUpResponse(data: any) {
  if (data?.user?.identities && data.user.identities.length === 0) {
    return {
      success: false,
      error: 'An account with this email already exists. Please sign in or reset your password.',
      needsEmailConfirmation: false,
    };
  }

  const needsEmailConfirmation = !data?.session;
  return {
    success: true,
    error: null,
    needsEmailConfirmation,
    message: needsEmailConfirmation
      ? 'Registration successful! Please check your email to verify your account before signing in.'
      : 'Account created successfully! You can now sign in with your credentials.',
  };
}

test('validateRegistrationForm rejects empty or single-character full name', () => {
  const res1 = validateRegistrationForm({ fullName: '   ', email: 'test@example.com', password: 'password123', confirmPassword: 'password123' });
  assert.equal(res1.valid, false);
  assert.equal(res1.error, 'Please enter your full name.');

  const res2 = validateRegistrationForm({ fullName: 'A', email: 'test@example.com', password: 'password123', confirmPassword: 'password123' });
  assert.equal(res2.valid, false);
  assert.equal(res2.error, 'Full name must be at least 2 characters long.');
});

test('validateRegistrationForm rejects invalid email formats', () => {
  const invalidEmails = ['invalid', 'test@', 'test@example', 'test@.com'];
  for (const email of invalidEmails) {
    const res = validateRegistrationForm({ fullName: 'Rahul Sharma', email, password: 'password123', confirmPassword: 'password123' });
    assert.equal(res.valid, false);
    assert.equal(res.error, 'Please enter a valid email address.');
  }
});

test('validateRegistrationForm rejects short password and mismatched passwords', () => {
  const res1 = validateRegistrationForm({ fullName: 'Rahul Sharma', email: 'test@example.com', password: '123', confirmPassword: '123' });
  assert.equal(res1.valid, false);
  assert.equal(res1.error, 'Password must be at least 6 characters long.');

  const res2 = validateRegistrationForm({ fullName: 'Rahul Sharma', email: 'test@example.com', password: 'password123', confirmPassword: 'password456' });
  assert.equal(res2.valid, false);
  assert.equal(res2.error, 'Passwords do not match.');
});

test('validateRegistrationForm passes valid inputs', () => {
  const res = validateRegistrationForm({
    fullName: 'Rahul Sharma',
    email: 'rahul@example.com',
    password: 'securePassword123',
    confirmPassword: 'securePassword123',
  });
  assert.equal(res.valid, true);
  assert.equal(res.error, null);
});

test('evaluateSignUpResponse detects duplicate email with obfuscated identities', () => {
  const data = {
    user: { id: 'u123', email: 'existing@example.com', identities: [] },
    session: null,
  };
  const res = evaluateSignUpResponse(data);
  assert.equal(res.success, false);
  assert.match(res.error || '', /already exists/i);
});

test('evaluateSignUpResponse detects when email confirmation is enabled in Supabase', () => {
  const data = {
    user: { id: 'u123', email: 'new@example.com', identities: [{ id: 'id123' }] },
    session: null, // No session until email verified
  };
  const res = evaluateSignUpResponse(data);
  assert.equal(res.success, true);
  assert.equal(res.needsEmailConfirmation, true);
  assert.match(res.message || '', /check your email to verify/i);
});

test('evaluateSignUpResponse handles instant sign in when email confirmation is disabled', () => {
  const data = {
    user: { id: 'u123', email: 'new@example.com', identities: [{ id: 'id123' }] },
    session: { access_token: 'jwt-token-123' },
  };
  const res = evaluateSignUpResponse(data);
  assert.equal(res.success, true);
  assert.equal(res.needsEmailConfirmation, false);
  assert.match(res.message || '', /Account created successfully/i);
});

test('placeholder credentials correctly flagged as unconfigured', () => {
  const placeholders = [
    'https://your-project-id.supabase.co',
    'https://placeholder-project.supabase.co',
    'https://<your-project>.supabase.co',
    '',
  ];
  for (const url of placeholders) {
    const isPlaceholder = !url || url.includes('your-project-id') || url.includes('placeholder') || url.includes('<your-');
    assert.equal(isPlaceholder, true, `Expected ${url} to be flagged as placeholder`);
  }

  const validUrl = 'https://abcdefghijklmnopqrst.supabase.co';
  const isPlaceholder = !validUrl || validUrl.includes('your-project-id') || validUrl.includes('placeholder') || validUrl.includes('<your-');
  assert.equal(isPlaceholder, false, 'Expected real URL to not be flagged as placeholder');
});
