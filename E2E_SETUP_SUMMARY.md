# E2E Testing - Simplified Fail-Fast Setup

## ✅ What Was Set Up

A simple end-to-end setup that requires an already running app server and fails fast otherwise.

### Problem Solved
- ✅ Clear contract: start app first, then run e2e
- ✅ Fast feedback when app server is missing
- ✅ Works from command line and VS Code tests panel
- ✅ Reduced orchestration complexity

## 📁 Files Created/Modified

| File | Purpose |
|------|---------|
| `e2e-tests/playwright.config.ts` | Lean Playwright config (no auto-start webServer command) |
| `e2e-tests/package.json` | `wait-on` precheck + Playwright execution |
| `e2e-tests/E2E_TESTING_GUIDE.md` | Complete user guide |

## 🚀 Quick Start

### Option 1: Command Line (simplest)
```bash
# Terminal 1
cd app && wasp start

# Terminal 2
cd e2e-tests
npm run e2e:playwright
```

### Option 2: VS Code Tests Panel
1. Install `ms-playwright.playwright` extension
2. Go to Testing view (Ctrl+Shift+X → Testing)
3. Click play button ▶️

### Option 3: Manual Playwright command
```bash
cd e2e-tests && npx playwright test
```

## 🔧 How It Works

### Runtime Flow
1. App is started externally (`cd app && wasp start`)
2. `npm run e2e:playwright` checks `http://127.0.0.1:3000` via `wait-on`
3. Playwright executes tests against the running app

### `playwright.config.ts` Logic
- Single config with `baseURL` set to `http://127.0.0.1:3000`
- No startup command in Playwright config
- Startup responsibility is intentionally outside Playwright

## 📊 All Scenarios Covered

| Initial State | Result |
|---|---|
| App server running on 3000 | ✅ Tests run |
| App server not running | ❌ Fails fast before tests |

## ⏱️ Performance

- **App startup**: handled by `wasp start`
- **E2E command**: quick fail if server is unavailable
- **VS Code panel**: Same as command line

## 📖 Documentation

Full guide: [e2e-tests/E2E_TESTING_GUIDE.md](e2e-tests/E2E_TESTING_GUIDE.md)

Topics covered:
- Quick start (3 methods)
- What's handled automatically
- Scenario walkthroughs
- Troubleshooting
- Environment variables
- Timeouts and configuration

## 🎯 Key Features

✅ **Predictable**: Explicit app-start then test-run flow  
✅ **Reliable**: No hidden auto-start behavior  
✅ **Simple**: Fewer moving parts  
✅ **Fast failure**: Immediate feedback when server is missing  
✅ **IDE Integration**: Works in VS Code tests panel  
✅ **CI Ready**: Works with explicit startup orchestration  
✅ **Documented**: Complete user guide included  

## 🔍 What Happens Behind the Scenes

```
npm run e2e:playwright
    ↓
wait-on http://127.0.0.1:3000 -t 5000
    ↓
playwright test (reads config)
    ↓
Server responds → Run tests
```

## 🛠️ Customization

### Increase fail-fast wait window
Edit `e2e-tests/package.json` script `e2e:playwright` and increase `-t 5000`.

### Change database settings
All DB settings are in `app/schema.prisma` and `app/main.wasp`

### Run specific tests
```bash
npm run e2e:playwright -- tests/pricingPageTests.spec.ts
```

## ✨ Next Steps

1. **Install extension**: `ms-playwright.playwright` in VS Code
2. **First run**: `cd e2e-tests && npm run e2e:playwright`
3. **VS Code testing**: Go to Testing view and click play
4. **Read guide**: Check `e2e-tests/E2E_TESTING_GUIDE.md` for details

---

**Status**: ✅ Simplified and consistent with current scripts
