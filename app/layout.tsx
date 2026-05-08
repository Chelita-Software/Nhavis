import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NHAVIS — Sistema de Mantenimiento",
  description: "Demo de gestión de órdenes de reparación",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
