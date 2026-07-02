import { Fraunces, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Editorial serif for headlines — elegant, magazine-like.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

// Clean body / UI font.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "wandr — your trip, planned in minutes",
  description: "Answer a few questions and get 3 personalized destinations in 2 minutes.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
      {/* Travelpayouts "Drive" — monetizes travel links (account 545763). */}
      <Script
        src="https://emrldtp.cc/NTQ1NzYz.js?t=545763"
        strategy="afterInteractive"
      />
    </html>
  );
}
