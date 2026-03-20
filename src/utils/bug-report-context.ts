export interface BugReportContext {
  route: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  userAgent: string;
  appVersion: string;
}

function parseBrowser(ua: string): { name: string; version: string } {
  const browsers = [
    { name: "Edge", regex: /Edg\/(\d+)/ },
    { name: "Opera", regex: /OPR\/(\d+)/ },
    { name: "Chrome", regex: /Chrome\/(\d+)/ },
    { name: "Firefox", regex: /Firefox\/(\d+)/ },
    { name: "Safari", regex: /Version\/(\d+).*Safari/ },
  ];
  for (const b of browsers) {
    const m = ua.match(b.regex);
    if (m) return { name: b.name, version: m[1] };
  }
  return { name: "Unknown", version: "" };
}

function parseOS(ua: string, platform: string): { name: string; version: string } {
  if (/Mac/i.test(platform)) {
    const m = ua.match(/Mac OS X ([\d_]+)/);
    return { name: "macOS", version: m ? m[1].replace(/_/g, ".") : "" };
  }
  if (/Win/i.test(platform)) {
    const m = ua.match(/Windows NT ([\d.]+)/);
    const versions: Record<string, string> = { "10.0": "10/11", "6.3": "8.1", "6.2": "8", "6.1": "7" };
    return { name: "Windows", version: m ? (versions[m[1]] ?? m[1]) : "" };
  }
  if (/Linux/i.test(platform)) return { name: "Linux", version: "" };
  if (/Android/i.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/);
    return { name: "Android", version: m ? m[1] : "" };
  }
  if (/iPhone|iPad/i.test(ua)) {
    const m = ua.match(/OS ([\d_]+)/);
    return { name: "iOS", version: m ? m[1].replace(/_/g, ".") : "" };
  }
  return { name: "Unknown", version: "" };
}

export function collectBugReportContext(pathname: string): BugReportContext {
  const ua = navigator.userAgent;
  const platform = navigator.platform ?? "";
  const browser = parseBrowser(ua);
  const os = parseOS(ua, platform);

  return {
    route: pathname,
    browserName: browser.name,
    browserVersion: browser.version,
    osName: os.name,
    osVersion: os.version,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    userAgent: ua,
    appVersion: import.meta.env.VITE_APP_VERSION ?? "1.0.0",
  };
}

export function formatContextSummary(ctx: BugReportContext): string {
  return [
    ctx.route,
    `${ctx.browserName} ${ctx.browserVersion}`,
    `${ctx.osName} ${ctx.osVersion}`,
    `${ctx.viewportWidth}×${ctx.viewportHeight}`,
  ].filter(Boolean).join(" · ");
}
