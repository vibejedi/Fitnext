import type { MetadataRoute } from "next";

/** Web app manifest — lets FitNext install to the home screen (iOS/Android)
 *  as a standalone app, the staging ground for the native iOS build. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitNext — Your AI Fitness Coach",
    short_name: "FitNext",
    description:
      "A gamified AI fitness coach. Pick your god, set your goal, and train.",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f4ec",
    theme_color: "#f7f4ec",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/brand/logo-tile.png", sizes: "1000x1000", type: "image/png", purpose: "any" },
      { src: "/brand/logo-tile.png", sizes: "1000x1000", type: "image/png", purpose: "maskable" },
    ],
  };
}
