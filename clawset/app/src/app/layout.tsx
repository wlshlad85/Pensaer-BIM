import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Clawhatch — Setup Your AI Assistant in 10 Minutes",
  description:
    "The automated setup wizard for OpenClaw & Clawdbot. Go from zero to a running AI assistant — free DIY, guided setup, or done-for-you. No terminal wizardry required.",
  metadataBase: new URL("https://clawhatch.com"),
  openGraph: {
    title: "Clawhatch — Setup Your AI Assistant in 10 Minutes",
    description:
      "Go from zero to a running AI assistant with OpenClaw. Free DIY guide, $39 Pro Setup, or ongoing support.",
    url: "https://clawhatch.com",
    siteName: "Clawhatch",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clawhatch — Setup Your AI Assistant in 10 Minutes",
    description:
      "Go from zero to a running AI assistant with OpenClaw. Free DIY guide, $39 Pro Setup, or ongoing support.",
  },
  keywords: [
    "OpenClaw",
    "Clawdbot",
    "AI assistant",
    "setup wizard",
    "developer tools",
    "open source",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${orbitron.variable} font-sans antialiased min-h-screen bg-background`}
      >
        {children}
      </body>
    </html>
  );
}
