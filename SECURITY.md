# Security Policy

## Reporting Security Issues

**DO NOT** open public GitHub issues for security vulnerabilities.

Please email security concerns to: **edwinjc1999@icloud.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## Credential Management

### Local Development (.env.local)
- **Never commit** `.env.local` to version control
- **Never share** credentials in Slack, email, or chat
- **Never hardcode** API keys in source files
- Rotate credentials quarterly or after each team member departure
- Use different keys for dev/staging/production

### Production (Vercel)
- All secrets stored **exclusively in Vercel Dashboard**
- No secrets in code, config files, or CI yaml
- CI uses placeholder values only (see `.github/workflows/ci.yml`)
- Each service has minimal-scope API key (read-only where possible)

### CI/CD (.github/workflows/ci.yml)
```yaml
env:
  SERPER_API_KEY: placeholder      # NOT a real key
  GROQ_API_KEY: placeholder        # NOT a real key
  UPSTASH_REDIS_REST_TOKEN: placeholder  # NOT a real key
```

Real secrets come from Vercel environment variables → GitHub Actions.

---

## API Key Scope & Rotation

| Service | Key | Free Tier | Rotation |
|---------|-----|-----------|----------|
| Groq | GROQ_API_KEY | 14,400 req/day | 6 months or if exposed |
| Serper | SERPER_API_KEY | 2,500 req/month | 6 months or if exposed |
| Upstash Redis | UPSTASH_REDIS_REST_TOKEN | 10,000 commands/day | 6 months or if exposed |

### How to Rotate Credentials

1. Generate new key at service provider:
   - Groq: https://console.groq.com
   - Serper: https://serper.dev/dashboard
   - Upstash: https://console.upstash.com

2. Update Vercel environment variables:
   ```
   Vercel Dashboard → Project → Settings → Environment Variables
   ```

3. Verify production works with new key

4. **Revoke old key** at service provider

5. Update local `.env.local` for local testing

---

## Prevented Attack Vectors

### Secrets in Code
- ✓ Pre-commit hook (`detect-secrets`) prevents hardcoded API keys
- ✓ All API keys use `process.env` (server-side only)
- ✓ No `NEXT_PUBLIC_` variables contain secrets

### Secrets in Version Control
- ✓ `.env.local` is gitignored
- ✓ `.env.*.local` is gitignored
- ✓ `*.key`, `*.pem`, `secrets/` are gitignored
- ✓ `.secrets.baseline` prevents secret history

### Secrets in CI/CD
- ✓ `.github/workflows/ci.yml` uses placeholder values
- ✓ Vercel-managed secrets don't appear in logs
- ✓ No hardcoded credentials in GitHub Actions

### Request Security
- ✓ Rate limiting: 8 requests/minute per IP (Redis + fallback)
- ✓ Request timeouts: 25s for Groq API (prevents hanging)
- ✓ Input validation: Query length, date format, subreddit name
- ✓ CORS-aware: Only accepts requests from Vercel domain

### Response Security
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
RateLimit-Limit: 8
RateLimit-Remaining: [count]
RateLimit-Reset: [unix timestamp]
```

---

## Deployment Security

### Pre-Deployment Checklist

- [ ] All code changes reviewed
- [ ] `npm audit` runs with no high/critical issues
- [ ] Type checking passes: `npx tsc --noEmit`
- [ ] Pre-commit hook passes: `detect-secrets scan`
- [ ] Build succeeds: `pnpm build`
- [ ] `.env.local` is NOT committed
- [ ] New env vars documented in `.env.example`
- [ ] Vercel secrets are up-to-date

### Deploy Steps

```bash
# 1. Create branch and make changes
git checkout -b feature/my-change

# 2. Run security checks
npm audit
detect-secrets scan --baseline .secrets.baseline

# 3. Commit with signed commits
git commit -S -m "feat: description"

# 4. Push to GitHub
git push origin feature/my-change

# 5. Create Pull Request
# GitHub Actions will run CI checks (type check, build check, npm audit)

# 6. Merge after review
git merge --ff-only feature/my-change

# 7. Vercel auto-deploys production on main push
```

---

## Dependencies & Vulnerabilities

### Weekly Security Audit
```bash
npm audit
npm outdated
```

### Update Dependencies
```bash
npm update          # Patch/minor updates
npm audit fix       # Automated vulnerability fixes
npm update -g npm   # Update npm itself
```

### Critical Vulnerabilities
If a critical vulnerability is found:
1. Update immediately: `npm update --depth 3`
2. Run `npm audit` to verify
3. Test locally: `pnpm dev`
4. Commit and deploy

### Monitored Dependencies
- Next.js (security patches)
- React (security patches)
- @prisma/client (database security)
- Groq SDK (API stability)
- @upstash/redis (caching security)

---

## Monitoring & Logging

### Security Events to Monitor
- Rate limit violations (429 responses)
- Failed API authentication
- Invalid input attempts
- Database errors
- External API failures

### Vercel Logs
```bash
vercel logs --follow    # Real-time logs
```

### Error Tracking
Errors are logged with:
- Timestamp
- Request ID (if available)
- Error message (sanitized in production)
- Stack trace (dev only)

**Do NOT log:**
- API keys or tokens
- User credentials
- Full request/response bodies (only paths/methods)

---

## Branch Protection Rules

The `main` branch requires:
- [x] Pull request review (1 approver)
- [x] Status checks passing (CI, type check, build)
- [x] Branches up to date before merge
- [x] Signed commits
- [x] Dismiss stale pull request approvals
- [x] Secret scanning enabled

---

## Incident Response

### If a Secret is Exposed

**Within 1 hour:**
1. Revoke the exposed key immediately
2. Open a private security issue (non-public)
3. Notify team members

**Within 24 hours:**
1. Generate new credentials
2. Update Vercel environment variables
3. Deploy new version
4. Verify production is working
5. Review how it leaked (audit logs, git history, etc.)

**After 24 hours:**
1. Document in incident log
2. Update security procedures if needed
3. Schedule team security training

### Git History Cleanup

If a secret was ever committed:

```bash
# Find the commit
git log --all -p | grep -i "gsk_\|sk_\|Bearer"

# Remove using BFG Repo-Cleaner (safer than git-filter-branch)
brew install bfg  # macOS
bfg --delete-files FILENAME

# Or remove specific string
bfg --replace-text passwords.txt

# Force push (only on non-production branch)
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin main --force-with-lease
```

---

## Security Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Security Lead | edwinjc1999@icloud.com | 24/7 for critical |
| On-call | [Your phone] | Business hours |

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Vercel Security](https://vercel.com/docs/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NPM Audit Documentation](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

## Document Version

- Version: 1.0
- Last Updated: 2026-06-02
- Next Review: 2026-09-02

