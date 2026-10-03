import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAI Books – Tours & Travels Notes & Accounts",
  description:
    "Production-ready note-card based accounting ledger for tours, tickets, visa services, and month-end management.",
  icons: {
    icon: "/brand/logo.jpg",
    apple: "/brand/logo.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
