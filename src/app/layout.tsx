import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const indigoSky = localFont({
  src: "./fonts/demo-indigo-sky.otf",
  variable: "--font-indigo-sky",
});

export const metadata: Metadata = {
  title: "CRB OT Clinic",
  description: "Management platform for CRB OT Clinic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${indigoSky.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
