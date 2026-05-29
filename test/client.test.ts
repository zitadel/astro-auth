import { describe, expect, it, beforeEach, afterEach } from '@jest/globals';

// The client helpers run only in the browser: they fetch a CSRF token and
// submit a hidden POST form (Auth.js v5 rejects a plain GET to its action
// endpoints). The test environment is Node, so we stub the minimal `fetch`
// and `document` surface they touch and assert on the form that gets built
// and submitted — the behavior, not a hard-coded URL string.

interface FakeInput {
  type: string;
  name: string;
  value: string;
}

interface FakeForm {
  method: string;
  action: string;
  readonly fields: FakeInput[];
  appendChild: (input: FakeInput) => void;
  submit: () => void;
}

let lastForm: FakeForm | null;
let submitCount: number;
const fetchCalls: string[] = [];

beforeEach(() => {
  lastForm = null;
  submitCount = 0;
  fetchCalls.length = 0;

  const fetchStub = (
    input: string,
  ): Promise<{ json: () => Promise<unknown> }> => {
    fetchCalls.push(input);
    return Promise.resolve({
      json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
    });
  };

  const documentStub = {
    createElement(tag: string): FakeForm | FakeInput {
      if (tag === 'form') {
        const fields: FakeInput[] = [];
        const form: FakeForm = {
          method: '',
          action: '',
          fields,
          appendChild(input: FakeInput) {
            fields.push(input);
          },
          submit() {
            submitCount += 1;
          },
        };
        lastForm = form;
        return form;
      }
      return { type: '', name: '', value: '' };
    },
    body: {
      appendChild() {
        // no-op: the form is tracked via `lastForm`
      },
    },
  };

  (globalThis as Record<string, unknown>).fetch = fetchStub;
  (globalThis as Record<string, unknown>).document = documentStub;
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).fetch;
  delete (globalThis as Record<string, unknown>).document;
});

function fieldsOf(form: FakeForm): Record<string, string> {
  return Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
}

describe('Auth Client', () => {
  describe('signIn', () => {
    it('fetches the CSRF token before submitting', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel');

      expect(fetchCalls).toContain('/api/auth/csrf');
    });

    it('submits a POST form to /api/auth/signin/{provider} when a provider is given', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel');

      expect(lastForm).not.toBeNull();
      expect(lastForm?.method).toBe('POST');
      expect(lastForm?.action).toBe('/api/auth/signin/zitadel');
      expect(submitCount).toBe(1);
    });

    it('includes the CSRF token as a hidden field', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel');

      expect(fieldsOf(lastForm!).csrfToken).toBe('test-csrf-token');
    });

    it('posts to /api/auth/signin when no provider is given', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn();

      expect(lastForm?.action).toBe('/api/auth/signin');
      expect(submitCount).toBe(1);
    });

    it('includes callbackUrl as a hidden field when provided', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel', { callbackUrl: '/dashboard' });

      expect(fieldsOf(lastForm!).callbackUrl).toBe('/dashboard');
    });

    it('omits callbackUrl when not provided', async () => {
      const { signIn } = await import('../src/client.js');

      await signIn('zitadel');

      expect(fieldsOf(lastForm!)).not.toHaveProperty('callbackUrl');
    });
  });

  describe('signOut', () => {
    it('submits a POST form to /api/auth/signout with the CSRF token', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut();

      expect(lastForm?.method).toBe('POST');
      expect(lastForm?.action).toBe('/api/auth/signout');
      expect(fieldsOf(lastForm!).csrfToken).toBe('test-csrf-token');
      expect(submitCount).toBe(1);
    });

    it('includes callbackUrl as a hidden field when provided', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut({ callbackUrl: '/' });

      expect(fieldsOf(lastForm!).callbackUrl).toBe('/');
    });

    it('omits callbackUrl when not provided', async () => {
      const { signOut } = await import('../src/client.js');

      await signOut();

      expect(fieldsOf(lastForm!)).not.toHaveProperty('callbackUrl');
    });
  });

  describe('module exports', () => {
    it('exports signIn as a function', async () => {
      const { signIn } = await import('../src/client.js');

      expect(typeof signIn).toBe('function');
    });

    it('exports signOut as a function', async () => {
      const { signOut } = await import('../src/client.js');

      expect(typeof signOut).toBe('function');
    });
  });
});
