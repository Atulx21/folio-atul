import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const TITLE = "Atul Parmar — Full-Stack Software Engineer";
const DESCRIPTION =
  "Computer Science graduate from IIIT Guwahati and full-stack software engineer building web and cross-platform mobile apps with React, React Native, Node.js and Supabase. Explore UniLink, AI-Tutor, MoodTunes and RozgarConnect.";

export const metadata: Metadata = {
  metadataBase: new URL("https://atul-folio.vercel.app"),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "Atul Parmar" }],
  keywords: [
    "Atul Parmar",
    "Full-Stack Developer",
    "Software Engineer",
    "React",
    "React Native",
    "Next.js",
    "IIIT Guwahati",
  ],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: "website",
    url: "/",
    siteName: "Atul Parmar",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#050507",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Atul Parmar",
  jobTitle: "Full-Stack Software Engineer",
  url: "https://atul-folio.vercel.app",
  alumniOf: {
    "@type": "CollegeOrUniversity",
    name: "Indian Institute of Information Technology, Guwahati",
  },
  sameAs: [
    "https://github.com/Atulx21",
    "https://www.linkedin.com/in/atul-parmar/",
    "https://leetcode.com/u/Atul_Parmar_21/",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased`}
    >
      <body className="min-h-screen">
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}