import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif" });

export const metadata: Metadata = {
  metadataBase: new URL("https://fundspring.vercel.app"),
  title: {
    default: "FundSpring — USDC crowdfunding built on Arc",
    template: "%s · FundSpring",
  },
  description:
    "Independent all-or-nothing USDC crowdfunding on Arc Network testnet.",
  applicationName: "FundSpring",
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "FundSpring",
    title: "FundSpring — USDC crowdfunding built on Arc",
    description: "Independent all-or-nothing USDC crowdfunding on Arc Network testnet.",
    url: "/",
    images: [{ url: "/demo-cover.svg", width: 1200, height: 630, alt: "FundSpring Community Launch" }],
  },
  twitter: {
    card: "summary",
    title: "FundSpring — USDC crowdfunding built on Arc",
    description: "Transparent, all-or-nothing USDC crowdfunding on Arc Network testnet.",
    images: ["/demo-cover.svg"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${manrope.variable} ${newsreader.variable}`}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
