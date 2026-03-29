"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2, ScanLine, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"

const CATEGORIES = [
  { value: "TRAVEL",         label: "Travel" },
  { value: "MEALS",          label: "Meals" },
  { value: "ACCOMMODATION",  label: "Accommodation" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "SUPPLIES",       label: "Supplies" },
  { value: "EQUIPMENT",      label: "Equipment" },
  { value: "OTHER",          label: "Other" },
]

const FALLBACK_CURRENCIES = [
  "AED","AUD","BRL","CAD","CHF","CNY","DKK","EUR","GBP","HKD",
  "INR","JPY","MXN","NGN","NOK","NZD","PLN","SEK","SGD","USD","ZAR",
]

interface FormData {
  description: string
  category: string
  date: string
  submittedAmount: string
  submittedCurrency: string
  exchangeRate: string
}

export default function NewExpensePage() {
  const router = useRouter()

  const [form, setForm] = useState<FormData>({
    description: "", category: "OTHER",
    date: new Date().toISOString().split("T")[0],
    submittedAmount: "", submittedCurrency: "USD", exchangeRate: "1",
  })

  const [companyCurrency, setCompanyCurrency] = useState("USD")
  const [currencies, setCurrencies]           = useState<string[]>(FALLBACK_CURRENCIES)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")
  const [rateLoading, setRateLoading]         = useState(false)
  const [rateError, setRateError]             = useState("")
  const [rateLastFetched, setRateLastFetched] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading]           = useState(false)
  const [ocrError, setOcrError]               = useState("")
  const [ocrSuccess, setOcrSuccess]           = useState(false)
  const [receiptFile, setReceiptFile]         = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview]   = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.companyCurrency) {
          setCompanyCurrency(d.companyCurrency)
          setForm((f) => ({ ...f, submittedCurrency: d.companyCurrency }))
        }
      }).catch(() => null)

    fetch("/api/countries")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.countries) {
          const codes = Array.from(new Set<string>(
            d.countries.map((c: { currency: string }) => c.currency)
          )).filter(Boolean).sort() as string[]
          if (codes.length > 0) setCurrencies(codes)
        }
      }).catch(() => null)
  }, [])

  const fetchRate = useCallback(async (from: string, to: string) => {
    if (from === to) { setForm((f) => ({ ...f, exchangeRate: "1" })); setRateLastFetched(null); return }
    setRateLoading(true); setRateError("")
    try {
      const res = await fetch(`/api/exchange-rate?from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok || !data.rate) throw new Error(data.error || "Failed")
      setForm((f) => ({ ...f, exchangeRate: String(data.rate) }))
      setRateLastFetched(new Date().toLocaleTimeString())
    } catch { setRateError("Could not fetch rate — enter manually") }
    finally { setRateLoading(false) }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (companyCurrency) fetchRate(form.submittedCurrency, companyCurrency) }, [form.submittedCurrency, companyCurrency])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file); setOcrError(""); setOcrSuccess(false)
    setReceiptPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null)
  }

  async function handleOCR() {
    if (!receiptFile) return
    setOcrLoading(true); setOcrError(""); setOcrSuccess(false)
    try {
      const fd = new FormData(); fd.append("file", receiptFile)
      const res = await fetch("/api/ocr", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { setOcrError(data.error || "OCR failed"); return }
      setForm((f) => ({
        ...f,
        description:       data.description ?? f.description,
        category:          data.category    ?? f.category,
        date:              data.date        ?? f.date,
        submittedAmount:   data.amount != null ? String(data.amount) : f.submittedAmount,
        submittedCurrency: data.currency    ?? f.submittedCurrency,
      }))
      setOcrSuccess(true)
    } catch { setOcrError("OCR request failed") }
    finally { setOcrLoading(false) }
  }

  const convertedAmount = form.submittedAmount && form.exchangeRate
    ? (parseFloat(form.submittedAmount) * parseFloat(form.exchangeRate)).toFixed(2)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError("")
    try {
      const res = await fetch("/api/expenses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description, category: form.category, date: form.date,
          submittedAmount: parseFloat(form.submittedAmount),
          submittedCurrency: form.submittedCurrency,
          exchangeRate: parseFloat(form.exchangeRate),
        }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || "Failed"); setLoading(false); return }
      const expense = await res.json()
      if (receiptFile && expense.id) {
        const fd = new FormData(); fd.append("file", receiptFile)
        await fetch(`/api/expenses/${expense.id}/receipt`, { method: "POST", body: fd }).catch(() => null)
      }
      router.push("/expenses")
    } catch { setError("An error occurred."); setLoading(false) }
  }

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="o-breadcrumb">
        <span
          className="text-[12px] text-blue-600 hover:underline cursor-pointer"
          onClick={() => router.push("/expenses")}
        >
          Expenses
        </span>
        <span className="text-gray-300 mx-1">/</span>
        <span className="text-[13px] font-semibold text-gray-800">New Expense</span>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl space-y-3">

          {/* OCR receipt panel */}
          <div className="o-container p-0 overflow-hidden">
            <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: "#dcdcdc", background: "#f7f7f7" }}>
              <span className="text-[12px] font-semibold text-gray-700 flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5 text-blue-600" />
                Receipt Scanning (OCR)
              </span>
              <span className="text-[11px] text-gray-400">Upload a receipt to auto-fill fields</span>
            </div>
            <div className="p-3 flex items-center gap-4">
              {/* Thumbnail or upload zone */}
              {receiptPreview ? (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={receiptPreview} alt="Receipt" className="w-16 h-16 object-cover rounded border" style={{ borderColor: "#dcdcdc" }} />
                  <button
                    type="button"
                    onClick={() => { setReceiptFile(null); setReceiptPreview(null); setOcrSuccess(false) }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center leading-none"
                  >×</button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors shrink-0"
                  style={{ borderColor: "#dcdcdc" }}
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px] font-medium">Upload</span>
                </button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button" className="o-toolbar-btn" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-3 h-3" />
                    {receiptFile ? "Change" : "Choose file"}
                  </button>

                  {receiptFile && (
                    <button
                      type="button"
                      className="o-toolbar-btn o-toolbar-btn-primary"
                      onClick={handleOCR}
                      disabled={ocrLoading}
                    >
                      {ocrLoading
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Scanning...</>
                        : <><ScanLine className="w-3 h-3" /> Scan Receipt</>}
                    </button>
                  )}

                  {receiptFile && (
                    <span className="text-[11px] text-gray-500 truncate max-w-[180px]">{receiptFile.name}</span>
                  )}
                </div>

                {ocrError && (
                  <p className="text-[11px] text-red-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {ocrError}
                  </p>
                )}
                {ocrSuccess && (
                  <p className="text-[11px] text-green-600 mt-1.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Fields auto-filled from receipt
                  </p>
                )}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Form */}
          <div className="o-container overflow-hidden">
            <div className="px-3 py-2 border-b" style={{ borderColor: "#dcdcdc", background: "#f7f7f7" }}>
              <span className="text-[12px] font-semibold text-gray-700">Expense Details</span>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mx-3 mt-3 px-3 py-2 rounded border border-red-200 bg-red-50 text-red-700 text-[12px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
                </div>
              )}

              <div className="p-3 space-y-3">
                {/* Description */}
                <div>
                  <label className="o-field-label">Description *</label>
                  <input
                    className="o-input"
                    placeholder="Business lunch with client"
                    value={form.description}
                    onChange={set("description")}
                    required
                    autoFocus
                  />
                </div>

                {/* Category + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="o-field-label">Category *</label>
                    <select className="o-input" value={form.category} onChange={set("category")}>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="o-field-label">Date *</label>
                    <input type="date" className="o-input" value={form.date} onChange={set("date")} required />
                  </div>
                </div>

                {/* Amount + Currency */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="o-field-label">Amount *</label>
                    <input
                      type="number" step="0.01" min="0.01"
                      className="o-input" placeholder="100.00"
                      value={form.submittedAmount} onChange={set("submittedAmount")} required
                    />
                  </div>
                  <div>
                    <label className="o-field-label">Currency *</label>
                    <select className="o-input" value={form.submittedCurrency} onChange={set("submittedCurrency")}>
                      {currencies.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Exchange rate */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="o-field-label">
                      Exchange Rate
                      <span className="ml-1 normal-case font-normal text-gray-400">
                        ({form.submittedCurrency} → {companyCurrency})
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => fetchRate(form.submittedCurrency, companyCurrency)}
                      disabled={rateLoading}
                      className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${rateLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.000001" min="0.000001"
                      className={`o-input ${rateLoading ? "opacity-60" : ""}`}
                      placeholder="1.000000"
                      value={form.exchangeRate} onChange={set("exchangeRate")} required
                    />
                    {rateLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
                  </div>
                  {rateError && (
                    <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {rateError}
                    </p>
                  )}
                  {rateLastFetched && !rateError && (
                    <p className="text-[11px] text-gray-400 mt-1">Rate fetched at {rateLastFetched}</p>
                  )}
                </div>

                {/* Converted amount preview */}
                {convertedAmount && form.submittedCurrency !== companyCurrency && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
                    <span className="text-[12px] text-blue-600">Converted:</span>
                    <span className="text-[13px] font-bold text-blue-800">{companyCurrency} {convertedAmount}</span>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="o-toolbar border-t border-b-0" style={{ borderTop: "1px solid #dcdcdc" }}>
                <button type="submit" disabled={loading} className="o-toolbar-btn o-toolbar-btn-primary">
                  {loading
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Creating...</>
                    : "Save"}
                </button>
                <button type="button" className="o-toolbar-btn" onClick={() => router.back()}>
                  Discard
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  )
}
