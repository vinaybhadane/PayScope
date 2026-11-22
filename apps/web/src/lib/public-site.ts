import type { Metadata } from "next";

export const publicSite = "https://payscope-web.onrender.com";

export const publicPages = {
  "/": {
    title: "PayScope | A clearer picture of your money",
    description: "Discover recurring payments, understand hidden charges, detect silent price increases and take control of your financial commitments.",
  },
  "/about": {
    title: "About PayScope",
    description: "Learn how PayScope uses imported statements to track subscriptions, recurring payments, and price changes.",
  },
  "/privacy": {
    title: "PayScope Privacy Policy",
    description: "Learn how PayScope handles uploaded statements, payment records, and workspace data.",
  },
  "/accessibility": {
    title: "PayScope Accessibility Statement",
    description: "Learn how to navigate PayScope with a keyboard, review payment records and report an accessibility barrier.",
  },
} as const;

export function publicPageMetadata(path: keyof typeof publicPages): Metadata {
  const { title, description } = publicPages[path];
  const url = new URL(path, publicSite);
  const image = `${publicSite}/holdingPhone.png`;
  return {
    alternates: { canonical: url },
    openGraph: {
      title, description, url, type: "website", siteName: "PayScope",
      images: [{ url: image, width: 1047, height: 1503, alt: "PayScope dashboard on a phone" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
