import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS shell for the FitNext alpha (TestFlight).
 *
 * The shell loads the deployed web app over HTTPS — the coach and
 * meal-estimate API routes are server-side, so the app can't be bundled
 * statically. Point `server.url` at a preview deployment to beta-test a
 * branch. `webDir` only holds the offline fallback page.
 *
 * Mac workflow: npm install → npx cap add ios → npx cap open ios
 * (set the Signing Team in Xcode, then Product → Archive for TestFlight).
 */
const config: CapacitorConfig = {
  appId: "com.vibejedi.fitnext",
  appName: "FitNext",
  webDir: "capacitor-www",
  server: {
    url: "https://fitnext.tech",
    cleartext: false,
  },
  ios: {
    contentInset: "automatic",
    backgroundColor: "#f7f4ec",
  },
};

export default config;
