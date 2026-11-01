import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Cálculo Eléctrico NEC | Supabase + Vercel",
  description:
    "Plataforma de ingeniería para cuadro de cargas, dimensionamiento de conductores AWG, caída de tensión y protecciones termomagnéticas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
