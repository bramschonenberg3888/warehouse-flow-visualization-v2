import type { Metadata } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Geist_Mono } from "next/font/google"
import "./globals.css"
import { TRPCReactProvider } from "@/trpc/react"
import { ThemeProvider } from "@/components/theme-provider"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Warehouse Flow",
  description: "Design warehouse layouts and visualize goods movement",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
