import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// Estilos de Leaflet (mapa) cargados globalmente: si solo se importan dentro del
// componente dinámico del mapa, a veces no se aplican y las teselas se descolocan.
import "leaflet/dist/leaflet.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Locally",
  description: "Asistente gastronómico inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
