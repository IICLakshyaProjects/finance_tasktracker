import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TaskTracker",
  description: "Role-based login for admin and user accounts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
