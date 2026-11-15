"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Receipt,
  Wallet,
  TrendingUp,
  Users,
  Printer,
  Share2,
  Mail,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  Plus,
  Camera,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type { AppTenant } from "@/app/page";
import {
  validateSpanishTaxId,
  computeVerifactuChainHash,
} from "@/lib/monpix-engine";
import {
  downloadTextFile,
  type MonpixWorkspaceData,
  type OfficeQuote,
  type OfficeInvoice,
  type ExpenseRecord,
} from "@/lib/monpix-store";

interface OficinaGastosViewProps {
  tenant: AppTenant;
  workspace: MonpixWorkspaceData;
  onUpdateWorkspace: (
    updater: (prev: MonpixWorkspaceData) => MonpixWorkspaceData
  ) => void;
}

export default function OficinaGastosView({
  tenant,
  workspace,
  onUpdateWorkspace,
}: OficinaGastosViewProps) {
  const [tab, setTab] = useState<
    | "presupuestos"
    | "facturas"
    | "gastos_tickets"
    | "pedido_material"
    | "rentabilidad"
    | "clientes_logo"
  >("presupuestos");

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(
    workspace.quotes[0]?.id || ""
  );
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");

  // Formulario Gasto / Ticket con validación NIF + paso Revísalo y guárdalo
  const [expSupplier, setExpSupplier] = useState("");
  const [expNif, setExpNif] = useState("B38901245");
  const [expDocNum, setExpDocNum] = useState("");
  const [expConcept, setExpConcept] = useState("");
  const [expProjectRef, setExpProjectRef] = useState("EXP-2026-VIVIENDA");
  const [expBase, setExpBase] = useState(120);
  const [expTaxPct, setExpTaxPct] = useState(
    tenant.isla ? 7 : 21
  );
  const [expCategory, setExpCategory] =
    useState<ExpenseRecord["category"]>("Material eléctrico");
  const [ticketOcrDraft, setTicketOcrDraft] = useState<string>("");
  const [pendingTicketConfirm, setPendingTicketConfirm] = useState(false);
  const [isAnalyzingTicket, setIsAnalyzingTicket] = useState(false);
  const [ticketVisionNote, setTicketVisionNote] = useState("");

  const handleTicketPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAnalyzingTicket(true);
    setTicketVisionNote("");
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const imageDataUrl =
          typeof reader.result === "string" ? reader.result : undefined;
        try {
          const res = await fetch("/api/analyze-vision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kind: "ticket_gasto",
              imageDataUrl,
              fileName: file.name,
              hintText: ticketOcrDraft,
            }),
          });
          const data = await res.json();
          if (data?.supplierName) setExpSupplier(data.supplierName);
          if (data?.supplierNif) setExpNif(data.supplierNif);
          if (data?.docNumber) setExpDocNum(data.docNumber);
          if (typeof data?.baseEuro === "number") setExpBase(data.baseEuro);
          if (typeof data?.taxPct === "number") setExpTaxPct(data.taxPct);
          if (data?.concept) setExpConcept(data.concept);
          setTicketVisionNote(
            data?.note || "Borrador extraído del ticket. Revísalo antes de guardar."
          );
          setPendingTicketConfirm(true);
        } catch {
          setTicketVisionNote(
            "No se pudo procesar la foto. Rellena los campos manualmente."
          );
        } finally {
          setIsAnalyzingTicket(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsAnalyzingTicket(false);
    }
  };

  // Nuevo cliente rápido / avería
  const [newClientName, setNewClientName] = useState("");
  const [newClientNif, setNewClientNif] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientAddress, setNewClientAddress] = useState("");

  const activeQuote: OfficeQuote | undefined =
    workspace.quotes.find((q) => q.id === selectedQuoteId) || workspace.quotes[0];

  const activeInvoice: OfficeInvoice | undefined =
    workspace.invoices.find((inv) => inv.id === selectedInvoiceId) ||
    workspace.invoices[0];

  const nifValidation = useMemo(() => validateSpanishTaxId(expNif), [expNif]);

  // Convertir Presupuesto en Factura correlativa con huella encadenada VeriFactu SHA-256
  const handleConvertQuoteToInvoice = async (quote: OfficeQuote) => {
    const nextSeq = workspace.invoices.length + 1;
    const seriesNumber = `F-2026-${String(nextSeq).padStart(4, "0")}`;
    const issueDateIso = new Date().toISOString().slice(0, 10);
    const generatedAtIso = new Date().toISOString();

    const subtotal = Number(
      quote.lines
        .reduce((acc, l) => acc + l.quantity * l.unitPriceEuro, 0)
        .toFixed(2)
    );
    const taxAmount = Number(((subtotal * quote.taxPct) / 100).toFixed(2));
    const total = Number((subtotal + taxAmount).toFixed(2));
    const prevHash =
      workspace.invoices[workspace.invoices.length - 1]?.verifactuHash || "";

    const vf = await computeVerifactuChainHash({
      issuerCif: tenant.cif || "B00000000",
      invoiceSeriesNumber: seriesNumber,
      issueDateIso,
      taxAmount,
      totalAmount: total,
      previousHash: prevHash,
      generatedAtIso,
    });

    const newInvoice: OfficeInvoice = {
      id: `inv-${Date.now()}`,
      seriesNumber,
      fromQuoteNumber: quote.number,
      projectId: quote.projectId,
      projectRef: quote.projectRef,
      clientName: quote.clientName,
      clientNif: quote.clientNif,
      clientAddress: quote.clientAddress,
      issueDateIso,
      generatedAtIso,
      taxPct: quote.taxPct,
      taxLabel: quote.taxLabel,
      subtotalEuro: subtotal,
      taxAmountEuro: taxAmount,
      totalEuro: total,
      lines: quote.lines.map((l) => ({
        concept: l.concept,
        quantity: l.quantity,
        unitPriceEuro: l.unitPriceEuro,
      })),
      previousHash: prevHash,
      verifactuHash: vf.hashHex,
      verifactuQrUrl: vf.qrVerificationUrl,
      paid: false,
    };

    onUpdateWorkspace((prev) => ({
      ...prev,
      quotes: prev.quotes.map((q) =>
        q.id === quote.id ? { ...q, status: "facturado" } : q
      ),
      invoices: [...prev.invoices, newInvoice],
    }));

    setSelectedInvoiceId(newInvoice.id);
    setTab("facturas");
  };

  // Cálculo "¿Cuánto te cuesta la hora?" y "¿Cuánto te deja cada obra?"
  const hourlyMetrics = useMemo(() => {
    const cfg = workspace.hourlyCostConfig;
    const totalAnnualCompanyCost =
      cfg.grossAnnualSalary * (1 + cfg.socialSecurityPct / 100);
    const billableHours =
      cfg.effectiveAnnualHours * (1 - cfg.nonBillableMermaPct / 100);
    const realHourCost =
      billableHours > 0 ? totalAnnualCompanyCost / billableHours : 0;
    return {
      totalAnnualCompanyCost: Math.round(totalAnnualCompanyCost),
      billableHours: Math.round(billableHours),
      realHourCost: Number(realHourCost.toFixed(2)),
    };
  }, [workspace.hourlyCostConfig]);

  const profitabilityByWork = useMemo(() => {
    const refs = new Set<string>();
    workspace.quotes.forEach((q) => refs.add(q.projectRef));
    workspace.invoices.forEach((i) => refs.add(i.projectRef));
    workspace.expenses.forEach((e) => refs.add(e.projectRef));
    workspace.timeLogs.forEach((t) => refs.add(t.projectRef));

    return Array.from(refs).map((ref) => {
      const billed = workspace.invoices
        .filter((i) => i.projectRef === ref)
        .reduce((a, b) => a + b.subtotalEuro, 0);
      const quoted = workspace.quotes
        .filter((q) => q.projectRef === ref)
        .reduce(
          (a, q) =>
            a + q.lines.reduce((s, l) => s + l.quantity * l.unitPriceEuro, 0),
          0
        );
      const revenueRef = billed > 0 ? billed : quoted;
      const materialExpenses = workspace.expenses
        .filter((e) => e.projectRef === ref)
        .reduce((a, e) => a + e.baseEuro, 0);
      const hours = workspace.timeLogs
        .filter((t) => t.projectRef === ref)
        .reduce((a, t) => a + t.hoursWorked, 0);
      const laborCost = hours * hourlyMetrics.realHourCost;
      const netProfit = revenueRef - materialExpenses - laborCost;

      return {
        projectRef: ref,
        revenueRef: Number(revenueRef.toFixed(2)),
        isBilled: billed > 0,
        materialExpenses: Number(materialExpenses.toFixed(2)),
        hours,
        laborCost: Number(laborCost.toFixed(2)),
        netProfit: Number(netProfit.toFixed(2)),
      };
    });
  }, [
    workspace.quotes,
    workspace.invoices,
    workspace.expenses,
    workspace.timeLogs,
    hourlyMetrics.realHourCost,
  ]);

  return (
    <div className="space-y-5">
      {/* Cabecera Oficina */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Oficina, Facturación VeriFactu, Gastos y Rentabilidad de Obras
          </h2>
          <p className="text-xs text-slate-500">
            Presupuestos con PDF limpio (sin costes internos), facturas correlativas con huella encadenada SHA-256, tickets y lo que te deja cada obra.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "presupuestos", label: `Presupuestos (${workspace.quotes.length})`, icon: <FileText className="h-3.5 w-3.5" /> },
              { id: "facturas", label: `Facturas VeriFactu (${workspace.invoices.length})`, icon: <Receipt className="h-3.5 w-3.5" /> },
              { id: "gastos_tickets", label: `Gastos y Tickets (${workspace.expenses.length})`, icon: <Wallet className="h-3.5 w-3.5" /> },
              { id: "pedido_material", label: `Pedido de Obra (${workspace.unifiedOrderCart?.length || 0})`, icon: <ShoppingCart className="h-3.5 w-3.5" /> },
              { id: "rentabilidad", label: "Rentabilidad y Hora", icon: <TrendingUp className="h-3.5 w-3.5" /> },
              { id: "clientes_logo", label: "Clientes, Avisos y Logo", icon: <Users className="h-3.5 w-3.5" /> },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                tab === t.id
                  ? "bg-[#0f6cbd] text-white"
                  : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 1. PRESUPUESTOS (PDF SIN COSTES NI MÁRGENES + WHATSAPP + FACTURAR) */}
      {tab === "presupuestos" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-xs lg:col-span-4 space-y-2.5 text-xs">
            <h3 className="font-bold text-slate-900">Tus presupuestos</h3>
            {workspace.quotes.map((q) => {
              const sum = q.lines.reduce((a, l) => a + l.quantity * l.unitPriceEuro, 0);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setSelectedQuoteId(q.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    activeQuote?.id === q.id
                      ? "border-[#0f6cbd] bg-blue-50/50"
                      : "border-slate-200 bg-slate-50/50 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#0f6cbd]">{q.number}</span>
                    <span className="rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700 ring-1 ring-slate-200">
                      {q.status}
                    </span>
                  </div>
                  <div className="mt-1 font-semibold text-slate-900 truncate">{q.clientName}</div>
                  <div className="text-[11px] text-slate-500 truncate">{q.title}</div>
                  <div className="mt-1 font-mono font-bold text-slate-800">
                    {(sum * (1 + q.taxPct / 100)).toFixed(2)} € ({q.taxLabel} incl.)
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-8 space-y-4">
            {activeQuote && (
              <>
                <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3.5 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      <Printer className="h-3.5 w-3.5 text-[#0f6cbd]" />
                      Imprimir PDF (sin costes internos)
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `Hola ${activeQuote.clientName}, te envío el presupuesto ${activeQuote.number} (${activeQuote.title}) de ${tenant.name}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Enviar por WhatsApp
                    </a>
                    <a
                      href={`mailto:${activeQuote.clientEmail}?subject=${encodeURIComponent(
                        `Presupuesto ${activeQuote.number} - ${tenant.name}`
                      )}&body=${encodeURIComponent(
                        `Adjunto resumen del presupuesto ${activeQuote.number} para ${activeQuote.title}.`
                      )}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Correo
                    </a>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleConvertQuoteToInvoice(activeQuote)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-3.5 py-1.5 font-semibold text-white hover:bg-[#115ea3]"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    Convertir en Factura
                  </button>
                </div>

                {/* Hoja Imprimible del Presupuesto — CERO costes ni márgenes internos */}
                <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-xs text-xs space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                    <div>
                      {workspace.companyLogoDataUrl && (
                        <img
                          src={workspace.companyLogoDataUrl}
                          alt="Logo empresa"
                          className="mb-2 h-11 object-contain"
                        />
                      )}
                      <div className="text-base font-extrabold text-slate-900">
                        {tenant.name}
                      </div>
                      <div className="text-slate-600">
                        CIF: {tenant.cif} · Empresa Instaladora Nº {tenant.empresa_instaladora_num}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-[#0f6cbd]">
                        PRESUPUESTO {activeQuote.number}
                      </div>
                      <div className="text-slate-500">
                        Fecha: {new Date(activeQuote.createdAtIso).toLocaleDateString("es-ES")}
                      </div>
                      <div className="text-slate-500">Obra: {activeQuote.projectRef}</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
                    <div className="font-bold text-slate-900">
                      Cliente: {activeQuote.clientName} ({activeQuote.clientNif || "—"})
                    </div>
                    <div className="text-slate-600">{activeQuote.clientAddress}</div>
                    <div className="mt-1 font-semibold text-[#0f6cbd]">{activeQuote.title}</div>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="py-2">Concepto / Partida</th>
                        <th className="py-2 text-right">Cant.</th>
                        <th className="py-2 text-right">Precio Ud.</th>
                        <th className="py-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeQuote.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="py-2.5 pr-3 font-medium text-slate-800">{l.concept}</td>
                          <td className="py-2.5 text-right font-mono">{l.quantity}</td>
                          <td className="py-2.5 text-right font-mono">
                            {l.unitPriceEuro.toFixed(2)} €
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold">
                            {(l.quantity * l.unitPriceEuro).toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {(() => {
                    const base = activeQuote.lines.reduce(
                      (a, l) => a + l.quantity * l.unitPriceEuro,
                      0
                    );
                    const tax = (base * activeQuote.taxPct) / 100;
                    return (
                      <div className="flex flex-col items-end border-t border-slate-200 pt-3 space-y-1">
                        <div>
                          Base imponible: <strong className="font-mono">{base.toFixed(2)} €</strong>
                        </div>
                        <div>
                          {activeQuote.taxLabel} ({activeQuote.taxPct}%):{" "}
                          <strong className="font-mono">{tax.toFixed(2)} €</strong>
                        </div>
                        <div className="text-base font-extrabold text-[#0f6cbd]">
                          TOTAL PRESUPUESTO: {(base + tax).toFixed(2)} €
                        </div>
                      </div>
                    );
                  })()}

                  <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                    {activeQuote.notes}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2. FACTURAS CON NUMERACIÓN CORRELATIVA Y HUELLA ENCADENADA VERIFACTU */}
      {tab === "facturas" && (
        <div className="space-y-4 text-xs">
          {workspace.invoices.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="font-bold text-slate-800">
                Aún no hay facturas emitidas en esta serie.
              </p>
              <p className="mt-1 text-slate-500">
                Ve a la pestaña Presupuestos y pulsa «Convertir en Factura» para generar la factura correlativa F-2026-0001 con huella SHA-256 VeriFactu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="no-print rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-4 space-y-2">
                <h3 className="font-bold text-slate-900">Serie correlativa F-2026</h3>
                {workspace.invoices.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      activeInvoice?.id === inv.id
                        ? "border-[#0f6cbd] bg-blue-50/50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex justify-between font-mono font-bold text-[#0f6cbd]">
                      <span>{inv.seriesNumber}</span>
                      <span>{inv.totalEuro.toFixed(2)} €</span>
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-900">{inv.clientName}</div>
                    <div className="text-[10px] font-mono text-slate-500 truncate">
                      Huella: {inv.verifactuHash.slice(0, 20)}...
                    </div>
                  </button>
                ))}
              </div>

              {activeInvoice && (
                <div className="rounded-2xl border border-slate-300 bg-white p-6 shadow-xs lg:col-span-8 space-y-4">
                  <div className="no-print flex justify-end">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0f6cbd] px-3.5 py-1.5 font-semibold text-white"
                    >
                      <Printer className="h-3.5 w-3.5" /> Imprimir Factura Oficial
                    </button>
                  </div>

                  <div className="flex justify-between border-b border-slate-200 pb-4">
                    <div>
                      <div className="text-base font-extrabold text-slate-900">{tenant.name}</div>
                      <div className="text-slate-600">CIF: {tenant.cif}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-extrabold text-[#0f6cbd]">
                        FACTURA {activeInvoice.seriesNumber}
                      </div>
                      <div>Fecha expedición: {activeInvoice.issueDateIso}</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                    <strong>Cliente:</strong> {activeInvoice.clientName} ·{" "}
                    <strong>NIF/CIF:</strong> {activeInvoice.clientNif || "—"} ·{" "}
                    {activeInvoice.clientAddress}
                  </div>

                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 text-[11px] uppercase text-slate-500">
                      <tr>
                        <th className="py-2">Descripción</th>
                        <th className="py-2 text-right">Cant.</th>
                        <th className="py-2 text-right">Precio</th>
                        <th className="py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeInvoice.lines.map((l, i) => (
                        <tr key={i}>
                          <td className="py-2">{l.concept}</td>
                          <td className="py-2 text-right font-mono">{l.quantity}</td>
                          <td className="py-2 text-right font-mono">{l.unitPriceEuro.toFixed(2)} €</td>
                          <td className="py-2 text-right font-mono font-bold">
                            {(l.quantity * l.unitPriceEuro).toFixed(2)} €
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                    {/* Bloque QR y huella encadenada VeriFactu RD 1007/2023 */}
                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 max-w-md">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white">
                        <QrCode className="h-10 w-10 text-slate-900" />
                      </div>
                      <div className="min-w-0 text-[10px] text-slate-600">
                        <div className="font-bold text-slate-900">
                          Registro encadenado VeriFactu (RD 1007/2023)
                        </div>
                        <div className="truncate font-mono">
                          SHA-256: {activeInvoice.verifactuHash}
                        </div>
                        <div className="truncate font-mono">
                          Ant.: {activeInvoice.previousHash ? activeInvoice.previousHash.slice(0, 16) : "ORIGEN_SERIE"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <div>Base: {activeInvoice.subtotalEuro.toFixed(2)} €</div>
                      <div>
                        {activeInvoice.taxLabel} ({activeInvoice.taxPct}%):{" "}
                        {activeInvoice.taxAmountEuro.toFixed(2)} €
                      </div>
                      <div className="text-base font-extrabold text-[#0f6cbd]">
                        TOTAL: {activeInvoice.totalEuro.toFixed(2)} €
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. GASTOS, TICKETS CON VALIDACIÓN NIF Y TRIMESTRE A GESTORÍA */}
      {tab === "gastos_tickets" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Meter ticket, albarán o factura de proveedor
            </h3>

            {/* Entrada rápida pegando texto de ticket / foto */}
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                  <Camera className="h-3.5 w-3.5 text-[#0f6cbd]" />
                  <span>Pega texto o sube foto del ticket/albarán (OCR + IA)</span>
                </div>
                <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-[#0f6cbd] px-2.5 py-1 font-semibold text-white hover:bg-[#115ea3]">
                  <Camera className="h-3.5 w-3.5" />
                  {isAnalyzingTicket ? "Leyendo ticket..." : "Subir foto"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleTicketPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {ticketVisionNote && (
                <p className="rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-900">
                  {ticketVisionNote}
                </p>
              )}
              <input
                type="text"
                placeholder="Ej: Sonepar B28123458 Base 185,50 EUR cable y mecanismos"
                value={ticketOcrDraft}
                onChange={(e) => setTicketOcrDraft(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5"
              />
              <button
                type="button"
                onClick={() => {
                  const nifM = ticketOcrDraft.match(/[A-Z0-9]{9}/i);
                  const numM = ticketOcrDraft.match(/(\d+(?:[.,]\d+)?)/);
                  if (nifM) setExpNif(nifM[0].toUpperCase());
                  if (numM) setExpBase(parseFloat(numM[1].replace(",", ".")));
                  if (ticketOcrDraft.trim()) setExpConcept(ticketOcrDraft.trim());
                  setPendingTicketConfirm(true);
                }}
                className="rounded-lg bg-slate-900 px-3 py-1 font-semibold text-white"
              >
                Rellenar borrador (Revísalo abajo)
              </button>
            </div>

            {pendingTicketConfirm && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-amber-900 font-semibold">
                Revísalo y guárdalo: comprueba proveedor, NIF y base antes de guardar el gasto.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Proveedor</label>
                <input
                  type="text"
                  value={expSupplier}
                  onChange={(e) => setExpSupplier(e.target.value)}
                  placeholder="Ej. Sonepar / Saltoki"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">NIF / CIF Proveedor</label>
                <input
                  type="text"
                  value={expNif}
                  onChange={(e) => setExpNif(e.target.value.toUpperCase())}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
                <span
                  className={`text-[10px] font-semibold ${
                    nifValidation.valid ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {nifValidation.valid
                    ? `✓ ${nifValidation.type} válido`
                    : nifValidation.reason}
                </span>
              </div>
              <div>
                <label className="font-semibold text-slate-700">Nº Ticket / Factura</label>
                <input
                  type="text"
                  value={expDocNum}
                  onChange={(e) => setExpDocNum(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Obra vinculada</label>
                <input
                  type="text"
                  value={expProjectRef}
                  onChange={(e) => setExpProjectRef(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Base imponible (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={expBase}
                  onChange={(e) => setExpBase(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">% IVA / IGIC</label>
                <select
                  value={expTaxPct}
                  onChange={(e) => setExpTaxPct(Number(e.target.value))}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs"
                >
                  <option value={21}>21% IVA</option>
                  <option value={10}>10% IVA</option>
                  <option value={7}>7% IGIC</option>
                  <option value={3}>3% IGIC</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="font-semibold text-slate-700">Categoría y Concepto</label>
                <div className="mt-1 flex gap-2">
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseRecord["category"])}
                    className="w-44 px-2.5 py-1.5 text-xs"
                  >
                    <option>Material eléctrico</option>
                    <option>Herramienta</option>
                    <option>Combustible / Furgoneta</option>
                    <option>Subcontrata</option>
                    <option>Fijo / Gestoría</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Detalle material..."
                    value={expConcept}
                    onChange={(e) => setExpConcept(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 flex items-center justify-between">
              <span>
                Cuadre verificado: Base {expBase.toFixed(2)} € + Impuesto{" "}
                {((expBase * expTaxPct) / 100).toFixed(2)} € ={" "}
                <strong>{(expBase * (1 + expTaxPct / 100)).toFixed(2)} €</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  const taxEuro = Number(((expBase * expTaxPct) / 100).toFixed(2));
                  const totalEuro = Number((expBase + taxEuro).toFixed(2));
                  onUpdateWorkspace((prev) => ({
                    ...prev,
                    expenses: [
                      {
                        id: `exp-${Date.now()}`,
                        dateIso: new Date().toISOString().slice(0, 10),
                        docType: "Factura",
                        supplierName: expSupplier || "Proveedor eléctrico",
                        supplierNif: nifValidation.normalized,
                        docNumber: expDocNum || `T-${Date.now().toString().slice(-4)}`,
                        category: expCategory,
                        concept: expConcept || "Compra de material",
                        projectRef: expProjectRef,
                        baseEuro: expBase,
                        taxPct: expTaxPct,
                        taxEuro,
                        totalEuro,
                        paymentMethod: "Tarjeta",
                        isFixedExpense: expCategory === "Fijo / Gestoría",
                      },
                      ...prev.expenses,
                    ],
                  }));
                  setExpConcept("");
                  setPendingTicketConfirm(false);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#0f6cbd] px-3.5 py-1.5 font-semibold text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Guardar gasto
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Libro de gastos y exportación del trimestre a gestoría
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const csv = [
                      "Fecha;Proveedor;NIF;Numero;Obra;Categoria;Base_EUR;Impuesto_Pct;Cuota_EUR;Total_EUR",
                      ...workspace.expenses.map(
                        (e) =>
                          `${e.dateIso};"${e.supplierName}";${e.supplierNif};${e.docNumber};${e.projectRef};"${e.category}";${e.baseEuro};${e.taxPct};${e.taxEuro};${e.totalEuro}`
                      ),
                    ].join("\n");
                    downloadTextFile(
                      `Trimestre_Gestoria_${tenant.cif}.csv`,
                      csv,
                      "text/csv;charset=utf-8"
                    );
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 font-semibold text-white"
                >
                  <Download className="h-3.5 w-3.5" /> Mandar trimestre a gestoría (CSV)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    downloadTextFile(
                      `Copia_Seguridad_REBT_${tenant.cif}.json`,
                      JSON.stringify(workspace, null, 2),
                      "application/json"
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700"
                >
                  <Download className="h-3.5 w-3.5" /> Copia seguridad
                </button>

                <label className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700">
                  <Upload className="h-3.5 w-3.5" /> Recuperar
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        try {
                          const parsed = JSON.parse(String(reader.result));
                          if (parsed && parsed.version === 1) {
                            onUpdateWorkspace(() => parsed);
                          }
                        } catch {
                          // archivo inválido
                        }
                      };
                      reader.readAsText(f);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Proveedor / NIF</th>
                    <th className="px-3 py-2">Obra</th>
                    <th className="px-3 py-2 text-right">Base</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workspace.expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="px-3 py-2">{e.dateIso}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{e.supplierName}</div>
                        <div className="text-[10px] text-slate-500">
                          {e.supplierNif} · {e.concept}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#0f6cbd]">{e.projectRef}</td>
                      <td className="px-3 py-2 text-right font-mono">{e.baseEuro.toFixed(2)} €</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">
                        {e.totalEuro.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. RENTABILIDAD POR OBRA Y ¿CUÁNTO TE CUESTA LA HORA? */}
      {tab === "rentabilidad" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              ¿Cuánto te cuesta de verdad cada hora de operario?
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Sueldo bruto anual (€)</label>
                <input
                  type="number"
                  value={workspace.hourlyCostConfig.grossAnnualSalary}
                  onChange={(e) =>
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      hourlyCostConfig: {
                        ...prev.hourlyCostConfig,
                        grossAnnualSalary: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Seguridad Social empresa (%)</label>
                <input
                  type="number"
                  value={workspace.hourlyCostConfig.socialSecurityPct}
                  onChange={(e) =>
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      hourlyCostConfig: {
                        ...prev.hourlyCostConfig,
                        socialSecurityPct: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Horas convenio / año</label>
                <input
                  type="number"
                  value={workspace.hourlyCostConfig.effectiveAnnualHours}
                  onChange={(e) =>
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      hourlyCostConfig: {
                        ...prev.hourlyCostConfig,
                        effectiveAnnualHours: Number(e.target.value) || 1,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Merma / desplazamientos (%)</label>
                <input
                  type="number"
                  value={workspace.hourlyCostConfig.nonBillableMermaPct}
                  onChange={(e) =>
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      hourlyCostConfig: {
                        ...prev.hourlyCostConfig,
                        nonBillableMermaPct: Number(e.target.value) || 0,
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
              <div className="text-slate-600">
                Coste empresa anual: {hourlyMetrics.totalAnnualCompanyCost.toLocaleString()} € /{" "}
                {hourlyMetrics.billableHours} h facturables
              </div>
              <div className="mt-1 text-2xl font-extrabold text-[#0f6cbd]">
                Te cuesta {hourlyMetrics.realHourCost} € / hora
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-7 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              ¿Cuánto te deja cada obra? (Ingresos − Compras − Horas fichadas)
            </h3>
            <div className="space-y-3">
              {profitabilityByWork.map((w) => (
                <div
                  key={w.projectRef}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-mono font-bold text-slate-900">{w.projectRef}</div>
                    <div className="text-[11px] text-slate-500">
                      {w.isBilled ? "Facturado" : "Presupuestado"}: {w.revenueRef} € · Material:{" "}
                      {w.materialExpenses} € · Mano obra ({w.hours}h): {w.laborCost} €
                    </div>
                  </div>
                  <div
                    className={`text-base font-extrabold font-mono ${
                      w.netProfit >= 0 ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {w.netProfit >= 0 ? `+${w.netProfit}` : w.netProfit} € limpios
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. CLIENTES, AVISOS/AVERÍAS Y LOGO DE EMPRESA */}
      {tab === "clientes_logo" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Clientes y Logo para tus PDFs</h3>
            <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
              <div>
                <div className="font-bold text-slate-800">Logo de la empresa instaladora</div>
                <div className="text-slate-500">Sale arriba en presupuestos, facturas y unifilares.</div>
              </div>
              <div className="flex items-center gap-2">
                {workspace.companyLogoDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateWorkspace((p) => ({ ...p, companyLogoDataUrl: "" }))
                    }
                    className="text-rose-600 font-semibold"
                  >
                    Quitar
                  </button>
                )}
                <label className="cursor-pointer rounded-lg bg-[#0f6cbd] px-3 py-1.5 font-semibold text-white">
                  Subir logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const r = new FileReader();
                      r.onload = () =>
                        onUpdateWorkspace((p) => ({
                          ...p,
                          companyLogoDataUrl: String(r.result || ""),
                        }));
                      r.readAsDataURL(f);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Nombre cliente / comunidad"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
              <input
                type="text"
                placeholder="NIF / CIF"
                value={newClientNif}
                onChange={(e) => setNewClientNif(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono"
              />
              <input
                type="text"
                placeholder="Teléfono"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
              <input
                type="text"
                placeholder="Dirección"
                value={newClientAddress}
                onChange={(e) => setNewClientAddress(e.target.value)}
                className="rounded-lg border border-slate-300 px-2.5 py-1.5"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!newClientName.trim()) return;
                onUpdateWorkspace((p) => ({
                  ...p,
                  clients: [
                    ...p.clients,
                    {
                      id: `cl-${Date.now()}`,
                      name: newClientName.trim(),
                      nif: newClientNif.trim(),
                      phone: newClientPhone.trim(),
                      email: "",
                      address: newClientAddress.trim(),
                    },
                  ],
                }));
                setNewClientName("");
                setNewClientNif("");
                setNewClientPhone("");
                setNewClientAddress("");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Añadir cliente
            </button>

            <div className="divide-y divide-slate-100">
              {workspace.clients.map((c) => (
                <div key={c.id} className="py-2 flex justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">{c.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {c.nif} · {c.address}
                    </div>
                  </div>
                  <span className="font-mono text-slate-600">{c.phone}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Avisos y Averías Rápidas</h3>
            {workspace.incidents.map((inc) => (
              <div
                key={inc.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-2">
                    {inc.urgency === "urgente" && (
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    )}
                    <span className="font-bold text-slate-900">{inc.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {inc.clientName} · {inc.address} · Tel: {inc.phone}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateWorkspace((prev) => ({
                      ...prev,
                      incidents: prev.incidents.map((x) =>
                        x.id === inc.id
                          ? {
                              ...x,
                              status: x.status === "resuelto" ? "pendiente" : "resuelto",
                            }
                          : x
                      ),
                    }))
                  }
                  className={`rounded-lg px-2.5 py-1 font-semibold ${
                    inc.status === "resuelto"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}
                >
                  {inc.status === "resuelto" ? "Resuelto" : "Pendiente"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. PEDIDO UNIFICADO DE MATERIAL PARA ALMACÉN */}
      {tab === "pedido_material" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                <ShoppingCart className="h-4 w-4 text-[#0f6cbd]" />
                <span>Pedido Unificado de Material a Almacén</span>
              </h3>
              <p className="text-slate-500">
                Agrupa material procedente del Presupuesto de Vivienda y del Simulador DIN en una sola lista de compra.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(workspace.unifiedOrderCart?.length || 0) > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateWorkspace((prev) => ({
                        ...prev,
                        unifiedOrderCart: [],
                      }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Vaciar lista
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const csv = [
                        "Origen;Expediente;Categoria;Cantidad;Concepto;Especificacion",
                        ...(workspace.unifiedOrderCart || []).map(
                          (i) =>
                            `"${i.source}";"${i.projectRef}";"${i.category}";${i.quantity};"${i.concept}";"${i.spec}"`
                        ),
                      ].join("\n");
                      downloadTextFile(
                        `Pedido_Unificado_Almacen_${tenant.cif}.csv`,
                        csv,
                        "text/csv;charset=utf-8"
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 font-semibold text-white hover:bg-emerald-700"
                  >
                    <Download className="h-3.5 w-3.5" /> Exportar Pedido Completo (CSV)
                  </button>
                </>
              )}
            </div>
          </div>

          {!workspace.unifiedOrderCart || workspace.unifiedOrderCart.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
              No hay líneas en el pedido todavía. Usa «+ Añadir al Pedido de Obra» desde <strong>Unifilar / Cuadro DIN</strong> o desde <strong>Presupuesto y Plano</strong>.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {workspace.unifiedOrderCart.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#0f6cbd]">
                        {item.source}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {item.projectRef}
                      </span>
                      <span className="font-bold text-slate-900">
                        {item.concept}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-500">
                      {item.category} · {item.spec}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateWorkspace((prev) => ({
                          ...prev,
                          unifiedOrderCart: (prev.unifiedOrderCart || []).map((x) =>
                            x.id === item.id
                              ? { ...x, quantity: Math.max(1, x.quantity - 1) }
                              : x
                          ),
                        }))
                      }
                      className="rounded border border-slate-300 px-2 py-0.5 font-bold"
                    >
                      −
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateWorkspace((prev) => ({
                          ...prev,
                          unifiedOrderCart: (prev.unifiedOrderCart || []).map((x) =>
                            x.id === item.id
                              ? { ...x, quantity: x.quantity + 1 }
                              : x
                          ),
                        }))
                      }
                      className="rounded border border-slate-300 px-2 py-0.5 font-bold"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateWorkspace((prev) => ({
                          ...prev,
                          unifiedOrderCart: (prev.unifiedOrderCart || []).filter(
                            (x) => x.id !== item.id
                          ),
                        }))
                      }
                      className="ml-2 text-rose-600 hover:text-rose-800"
                      title="Eliminar línea"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

