This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## iOS · TestFlight (Capacitor shell)

The native iOS app is a Capacitor shell that loads the deployed web app
(`server.url` in `capacitor.config.ts`, currently `https://fitnext.tech`).

On a Mac with Xcode installed (Capacitor 8 resolves native deps with Swift
Package Manager, so CocoaPods is not needed):

```bash
npm install
npx cap add ios              # generates the ios/ Xcode project (first time only)
./scripts/ios-permissions.sh # required — see below
npx cap open ios             # opens Xcode
```

`ios/` is generated and is not tracked in git, so `ios-permissions.sh` has to be
re-run after every `cap add ios`. It writes the four privacy usage descriptions
iOS demands before the web view may reach the hardware: camera and photo library
for meal/progress shots, microphone *and* speech recognition for coach voice
input. A missing key is not a silent denial — iOS kills the app on first use.

In Xcode:

1. **Signing & Capabilities** → select your Team; bundle ID is `com.vibejedi.fitnext`.
2. Test on a cable-connected iPhone with ▶, then **Product → Archive** →
   **Distribute App → App Store Connect** to upload.
3. In App Store Connect → **TestFlight**, add yourself as an Internal Tester
   (no review wait) and install via the TestFlight app.

After changing `capacitor.config.ts`, run `npx cap sync ios` before rebuilding.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
