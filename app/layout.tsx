import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TTB Alcohol Label Verifier",
  description:
    "Prototype: extract label fields and compare against application data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
