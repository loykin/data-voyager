import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { RefineContextProvider } from "./refine-context";

export const metadata: Metadata = {
  title: "Explorer - Data Source Management",
  description: "Explore and manage your data sources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
          <RefineContextProvider>
            {children}
          </RefineContextProvider>
        </Suspense>
      </body>
    </html>
  );
}
