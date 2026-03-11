import type { Metadata } from "next";
import localFont from "next/font/local";
import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
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
        className={`${dmSans.variable} ${indigoSky.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
