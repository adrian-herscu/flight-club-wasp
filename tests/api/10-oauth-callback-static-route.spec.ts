import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const oauthCallbackPagePath = path.join(repoRoot, 'public/oauth/callback');

describe('OAuth callback static route regression', () => {
  it('ships a bootstrap page for /oauth/callback', () => {
    expect(fs.existsSync(oauthCallbackPagePath)).toBe(true);

    const callbackPage = fs.readFileSync(oauthCallbackPagePath, 'utf8');

    expect(callbackPage).toContain("fetch('/', {");
    expect(callbackPage).toContain('document.write');
  });
});