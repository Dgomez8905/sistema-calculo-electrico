import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema de Cálculo Eléctrico REBT y Gestión Multi-Tenant M.T.D.",
  description:
    "Plataforma corporativa multi-tenant para cálculo eléctrico según el REBT (RD 842/2002 - ITC-BT-01 a BT-52), obra, presupuestos, VeriFactu, fichajes y Memoria Técnica de Diseño (M.T.D. B.T.).",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
