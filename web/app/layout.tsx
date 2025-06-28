import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "./components/AppThemeProvider";
import { CssBaseline, Box, Container } from "@mui/material";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { PusherProvider } from "./context/PusherProvider";
import "../lib/startup";
const inter = Inter({ subsets: ["latin"] });

const jetbrains_mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains-mono", // 3. 设置 CSS 变量名
});

export const metadata: Metadata = {
  title: "IoT Device Management Platform",
  description: "A platform for managing IoT devices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body
        className={`${inter.className} ${jetbrains_mono.variable}`}
        style={{ height: "100%" }}
      >
        <AppThemeProvider>
          <PusherProvider>
            <CssBaseline />
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
              }}
            >
              <Header />
              <Container component="main" sx={{ flex: 1, py: 3 }}>
                {children}
              </Container>
              <Footer />
            </Box>
          </PusherProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
