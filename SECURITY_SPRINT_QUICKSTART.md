# Security Fix Sprint - Quick Start Guide

**For:** Development Team
**Duration:** 4 weeks
**Kickoff Date:** 2025-11-12

---

## 🚀 Get Started in 5 Minutes

### Step 1: Create Feature Branch
```bash
# Already created, but here's how for future branches
git checkout -b security/critical-fixes
```

### Step 2: Set Up Development Environment
```bash
# Install Redis locally (Docker)
docker run -d -p 6379:6379 redis:7-alpine

# Install dependencies
npm install redis

# Create .env.local
cat > .env.local << 'EOF'
REDIS_URL=redis://localhost:6379
VIRUSTOTAL_API_KEY=your_key_here
EOF
```

### Step 3: Open Your Sprint Board
```bash
# Reference files:
cat SECURITY_FIX_SPRINT_PLAN.md        # Full sprint plan
cat SECURITY_REVIEW_FINDINGS.md        # Vulnerability details
cat SECURITY_REMEDIATION_GUIDE.md      # Implementation code
```

### Step 4: Pick Your First Task
```
Sprint 1 Tasks (Pick one):
☐ Task 1.1: Get Real User from Auth (2 hrs) - Auth Lead
☐ Task 1.2: Update NCA Actions (4 hrs) - Backend Dev
☐ Task 1.3: Auth Verification (4 hrs) - Backend Dev
☐ Task 1.4: Redis Infrastructure (2 hrs) - DevOps
☐ Task 1.5: Redis Rate Limiter (3 hrs) - Backend Dev
```

### Step 5: Start Implementing
```bash
# Example: Task 1.1
cd lib/database/
# Create getAuthenticatedUser() function in client.ts
# Follow code in SECURITY_REMEDIATION_GUIDE.md

# Add tests
npm run test -- lib/database/__tests__/client.test.ts

# Commit progress
git add .
git commit -m "security(auth): Add getAuthenticatedUser utility"
```

---

## 📋 Daily Workflow

### Morning Standup (9:00 AM)
1. Report what you completed yesterday
2. State what you're working on today
3. Mention any blockers

**Example:**
> "Yesterday I completed Task 1.1 (get auth user). Today I'm starting Task 1.2 (update NCA actions). Blocker: Need code review approval."

### Throughout the Day
```bash
# Every 2-3 hours, commit your progress
git add .
git commit -m "security(auth): Implement auth in createNCA action"

# Run tests frequently
npm run test -- [your-test-file]

# Keep sprint plan updated
# Update SECURITY_FIX_SPRINT_PLAN.md with actual times
```

### End of Day
```bash
# Push your branch
git push origin security/critical-fixes

# Create/update draft PR
# (Don't merge until sprint complete)
gh pr create --draft --title "Security: Critical Fixes Sprint"

# Update team on progress
# Share blockers, ask for help
```

---

## 🔍 Task Template

Use this for every task:

```markdown
## Task 1.X: [Task Name]
**Status:** In Progress (Started: TODAY)
**Story Points:** X
**Assignee:** YOUR NAME
**Time Remaining:** X hours

### What I'm Doing
[Brief description]

### Progress
- [x] Step 1
- [ ] Step 2
- [ ] Step 3

### Testing
- [ ] Unit tests written
- [ ] Tests passing
- [ ] Coverage >85%

### Blockers
None / [Description of blocker]

### Files Changed
- lib/file1.ts
- lib/file2.ts

### Next: [What comes after this task]
```

---

## ✅ Code Review Checklist

Before pushing, make sure:

- [ ] **Security:** No hardcoded secrets, no SQL injection
- [ ] **Tests:** All tests passing, >85% coverage
- [ ] **Types:** No `any` types (TypeScript strict mode)
- [ ] **Comments:** Added comments for non-obvious code
- [ ] **Error Handling:** All error paths handled
- [ ] **Performance:** No N+1 queries, reasonable response times

### Example PR Template
```markdown
# Security Fix: [Task Name]

## Changes
- Fixed [vulnerability]
- Added [new feature]
- Updated [file] to [description]

## Testing
- [ ] Unit tests: ✅ 15 tests, 95% coverage
- [ ] Integration tests: ✅ 3 tests
- [ ] E2E tests: ✅ Manual testing

## Security Review
- [ ] No secrets in code
- [ ] No SQL injection
- [ ] Auth checks present
- [ ] RLS policies aligned

## Blockers
None

## Merge Requirements
- [ ] Code review approval
- [ ] All tests passing
- [ ] Staging environment test complete
```

---

## 🛠️ Common Commands

```bash
# Run tests for your task
npm run test -- [filename].test.ts

# Run all security tests
npm run test:security

# Run type checking
npm run type-check

# Format code
npm run format

# Lint code
npm run lint

# Check for security issues
npm run audit

# View git diff
git diff

# Commit with message
git commit -m "security(category): Short description"

# See your progress
git log --oneline -n 10

# Stash work in progress
git stash

# Restore stashed work
git stash pop
```

---

## 📚 Documentation You'll Need

### During Implementation
- **SECURITY_REMEDIATION_GUIDE.md** - Copy code snippets from here
- **SECURITY_REVIEW_FINDINGS.md** - Understand the vulnerability details
- **CLAUDE.md** - Project conventions and patterns

### For Testing
- **lib/**__tests__/** folder - See existing test patterns
- **npm run test -- --help** - Jest test options

### For Deployment
- **SECURITY_FIX_SPRINT_PLAN.md** - Deployment checklist in Sprint 4

---

## 🆘 Getting Help

### "I'm stuck on a task"
1. Check SECURITY_REMEDIATION_GUIDE.md for code examples
2. Ask in standup
3. Pair program with teammate
4. Ask in Slack/Discord

### "My tests aren't passing"
1. Read the error message carefully
2. Check the test file for similar tests
3. Run `npm run test -- --verbose` for details
4. Ask the test author (often in code comments)

### "I found a security issue in my code"
1. Don't push the code
2. Tell the team immediately
3. Work on fixing it together
4. Document what happened for lessons learned

### "I think I'm blocked"
A task might be blocked if:
- Infrastructure not ready (needs DevOps)
- Waiting for code review feedback
- Upstream task not complete
- Missing information

**Action:** Flag in standup, break task into smaller pieces, or switch to another task.

---

## 🎯 Sprint 1 Fast Track (First Week)

If you want to make immediate progress, follow this order:

1. **Hour 1:** Set up Redis
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   # Test: redis-cli ping → should print PONG
   ```

2. **Hour 2-3:** Task 1.1 - Create `getAuthenticatedUser()`
   - Add function to `lib/database/client.ts`
   - Add unit tests
   - Run tests

3. **Hour 4-7:** Task 1.2 - Update NCA Actions
   - Update `createNCA()` to use real user
   - Update `saveDraftNCA()` to use real user
   - Add tests for each

4. **Hour 8-11:** Task 1.3 - Add Auth Verification
   - Add auth checks to file-actions.ts
   - Add auth checks to other actions
   - Add tests

5. **Hour 12:** Code review & fixes
   - Share PR with team
   - Address feedback
   - Merge to main branch

**Commit Messages by Hour:**
```
Hour 1:  "chore: Set up Redis locally"
Hour 3:  "security(auth): Add getAuthenticatedUser utility"
Hour 7:  "security(nca): Use real user ID in NCA actions"
Hour 11: "security(actions): Add auth verification to all server actions"
Hour 12: "Merge: Security Sprint 1 - Authentication Fixes"
```

---

## 📊 Progress Tracking

### Update This Daily
```bash
# Check your progress
git log --oneline security/critical-fixes

# See files you've changed
git diff main..HEAD --name-only

# Count your commits
git rev-list --count main..HEAD
```

### Weekly Metrics
- [ ] Tasks completed: X/Y
- [ ] Tests passing: X/Y
- [ ] Code review feedback: X items
- [ ] Blockers resolved: X/Y

---

## 🚨 Critical Path Dependencies

Some tasks depend on others. Here's the order:

```
Task 1.4 (Redis infra) → Task 1.5 (Redis rate limiter)
                           ↓
Task 1.1 (Get auth) → Task 1.2 (Update actions) → Task 1.3 (Add auth checks)
```

**Bottom line:** Task 1.4 should start first, then Tasks 1.1-1.3 can be parallel.

---

## 🎓 Learning Resources

### If you're new to the project
1. Read `CLAUDE.md` - Project overview
2. Look at `app/actions/nca-actions.ts` - Example server action
3. Look at `lib/database/client.ts` - Auth patterns

### If you need to understand Supabase
1. https://supabase.com/docs/guides/auth
2. https://supabase.com/docs/guides/row-level-security
3. https://supabase.com/docs/reference/javascript/auth-getsession

### If you need to understand Redis
1. https://redis.io/docs/
2. https://www.npmjs.com/package/redis (JavaScript client)

---

## 💡 Pro Tips

### Tip 1: Save Early, Save Often
```bash
# Commit small, logical changes frequently
# Not: One commit with 10 files changed
# Yes: 3 commits with 3 files each
```

### Tip 2: Test-Driven Development
```bash
# 1. Write failing test
# 2. Write code to make it pass
# 3. Refactor if needed
npm run test -- --watch  # Auto-run tests on file changes
```

### Tip 3: Use Comments Effectively
```typescript
// ❌ Bad comment (obvious)
// Increment counter
count++;

// ✅ Good comment (explains WHY)
// Increment counter to track attempts (BRCGS 3.3 compliance)
count++;
```

### Tip 4: Pair Program on Hard Tasks
```bash
# Screen share, take turns at keyboard
# Great for learning, code quality, and motivation
```

### Tip 5: Celebrate Wins
After completing a task:
```bash
# Tell the team!
# Share your test results
# Do a quick code walkthrough
# Celebrate progress ✨
```

---

## 📅 Sprint Checklist

### Monday (Day 1)
- [ ] Read SECURITY_FIX_SPRINT_PLAN.md
- [ ] Attend kickoff meeting
- [ ] Set up development environment
- [ ] Claim your first task

### Tuesday-Thursday (Days 2-4)
- [ ] Make daily progress
- [ ] Ask questions in standup
- [ ] Request code reviews
- [ ] Update SPRINT_PLAN.md with actual times

### Friday (Day 5)
- [ ] Complete Sprint 1 tasks
- [ ] Merge PRs
- [ ] Prepare for Sprint 2
- [ ] Celebrate Sprint 1 completion! 🎉

---

## Questions?

**Refer to:**
- Sprint plan details → SECURITY_FIX_SPRINT_PLAN.md
- Code examples → SECURITY_REMEDIATION_GUIDE.md
- Vulnerability info → SECURITY_REVIEW_FINDINGS.md
- Project patterns → CLAUDE.md

**Ask the team:**
- Standup meeting (daily)
- Slack/Discord channel
- Direct message to task owner

---

**You've got this! 🚀**

Start with Task 1.1, keep the momentum going, and we'll have all fixes shipped in 4 weeks. Let me know if you have any questions!
