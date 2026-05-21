---
name: agent-browser
description: |
  Web browsing and automation skill for agents.
  Use for navigating websites, extracting information, taking screenshots,
  and interacting with web pages programmatically.
  Triggers: "browser", "web", "navigate", "screenshot", "scrape", "crawl", "webpage"
---

# Agent Browser

Web browsing and automation skill for interacting with websites programmatically.

## When to use

Use this skill when you need to:
- Navigate to websites and extract information
- Take screenshots of web pages
- Scrape content from web pages
- Crawl websites for information
- Interact with web page elements
- Test web applications

## Available Tools

### WebFetch
Fetch and process web page content from URLs.

```typescript
WebFetch({
  url: "https://example.com",
  prompt: "Extract the main content from this page"
})
```

### WebSearch
Search the web for information.

```typescript
WebSearch({
  query: "search terms here"
})
```

### Browser Automation (if available)
For more advanced interactions, use Puppeteer or Playwright via Bash commands.

## Common Workflows

### 1. Extract information from a URL
```
1. Use WebFetch to fetch the page
2. Specify what information to extract in the prompt
```

### 2. Search and then visit pages
```
1. Use WebSearch to find relevant pages
2. Use WebFetch on promising URLs
3. Synthesize the information
```

### 3. Take screenshots (using Bash)
```bash
# Requires puppeteer or similar tool
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({path: 'screenshot.png'});
  await browser.close();
})();
"
```

## Best Practices

1. Always respect robots.txt and website terms of service
2. Add reasonable delays between requests to avoid overwhelming servers
3. Use WebSearch first to find relevant pages before using WebFetch
4. Be specific in your WebFetch prompts about what information to extract
5. Handle errors gracefully - if a page can't be fetched, try an alternative source
