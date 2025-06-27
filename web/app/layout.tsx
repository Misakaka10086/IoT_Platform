import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "./components/AppThemeProvider";
import { CssBaseline, Box, Container } from "@mui/material";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { PusherProvider } from "./context/PusherProvider";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className} style={{ height: "100%" }}>
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
