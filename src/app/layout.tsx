import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Bitcoin explorer", template: "%s" },
  description: "Look up any Bitcoin address, transaction or block. See balances, transaction totals, charts and counterparties.",
};

export const viewport: Viewport = { themeColor: "#eef1f6", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <a className="skip" href="#main">Skip to content</a>
          <Header />
          <main id="main" className="container main">
            {children}
          </main>
          <footer className="site-footer">
            <div className="container">
              Informational only. Not financial advice.
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
