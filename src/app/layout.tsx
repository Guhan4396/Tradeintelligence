import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TradeIntel — Trade Intelligence for Indian Textile Exporters",
  description:
    "Know what's changing before it costs you money. Tariff alerts, FTA benefits, shipment checks — specific to your products and markets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
