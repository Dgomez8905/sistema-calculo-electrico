import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Cálculo Eléctrico REBT (RD 842/2002 - ITC-BT-01 a BT-52)",
  description:
    "Plataforma de ingeniería eléctrica según el Reglamento Electrotécnico para Baja Tensión (REBT): Cuadro de circuitos en mm², Previsión de Cargas ITC-BT-10/52, LGA/DI ITC-BT-14/15, Puesta a Tierra ITC-BT-18/24 y Legalización ITC-BT-04/05.",
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
