"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageHeader } from "@/components/ui/page-header"
import { Upload, Loader2, ScanLine, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const EXPENSE_CATEGORIES = [
  { value: "TRAVEL",         label: "Travel" },
  { value: "MEALS",          label: "Meals" },
  { value: "ACCOMMODATION",  label: "Accommodation" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "SUPPLIES",       label: "Supplies" },
  { value: "EQUIPMENT",      label: "Equipment" },
  { value: "OTHER",          label: "Other" },
]

// Common currencies — full list loaded from API
const FALLBACK_CURRENCIES = [
  "USD","EUR","GBP","INR","JPY","CAD","AUD","SGD","AED","CHF","BRL","MXN","ZAR","NGN","CNY","HKD","SEK","NOK","DKK","PLN",
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
    description:       "",
    category:          "OTHER",
    date:              new Date().toISOString().split("T")[0],
    submittedAmount:   "",
    submittedCurrency: "USD",
    exchangeRate:      "1",
  })

  const [companyCurrency, setCompanyCurrency] = useState("USD")
  const [currencies, setCurrencies]           = useState<string[]>(FALLBACK_CURRENCIES)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")

  // Exchange rate state
  const [rateLoading, setRateLoading]   = useState(false)
  const [rateError, setRateError]       = useState("")
  const [rateLastFetched, setRateLastFetched] = useState<string | null>(null)

  // OCR state
  const [ocrLoading, setOcrLoading]     = useState(false)
  const [ocrError, setOcrError]         = useState("")
  const [ocrSuccess, setOcrSuccess]     = useState(false)
  const [receiptFile, setReceiptFile]   = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load company currency
  useEffect(() => {
    fetch("/api/dashboard/data")
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)

    // Get company currency from expenses API
    fetch("/api/expenses")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.companyCurrency) {
          setCompanyCurrency(d.companyCurrency)
          setForm((f) => ({ ...f, submittedCurrency: d.companyCurrency }))
        }
      })
      .catch(() => null)

    // Load full currency list from countries
    fetch("/api/countries")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.countries) {
          const codes = Array.from(new Set<string>(d.countries.map((c: { currency: string }) => c.currency)))
            .filter(Boolean)
            .sort() as string[]
          if (codes.length > 0) setCurrencies(codes)
        }
      })
      .catch(() => null)
  }, [])

  // Auto-fetch exchange rate when currency changes
  const fetchRate = useCallback(async (from: string, to: string) => {
    if (from === to) {
      setForm((f) => ({ ...f, exchangeRate: "1" }))
      setRateLastFetched(null)
      return
    }
    setRateLoading(true)
    setRateError("")
    try {
      const res = await fetch(`/api/exchange-rate?from=${from}&to=${to}`)
      const data = await res.json()
      if (!res.ok || !data.rate) throw new Error(data.error || "Failed")
      setForm((f) => ({ ...f, exchangeRate: String(data.rate) }))
      setRateLastFetched(new Date().toLocaleTimeString())
    } catch {
      setRateError("Could not fetch rate — enter manually")
    } finally {
      setRateLoading(false)
    }
  }, [])

  useEffect(() => {
    if (companyCurrency) {
      fetchRate(form.submittedCurrency, companyCurrency)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.submittedCurrency, companyCurrency])

  // OCR: handle file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setOcrError("")
    setOcrSuccess(false)

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setReceiptPreview(url)
    } else {
      setReceiptPreview(null)
    }
  }

  async function handleOCR() {
    if (!receiptFile) return
    setOcrLoading(true)
    setOcrError("")
    setOcrSuccess(false)

    try {
      const fd = new FormData()
      fd.append("file", receiptFile)

      const res = await fetch("/api/ocr", { method: "POST", body: fd })
      const data = await res.json()

      if (!res.ok) {
        setOcrError(data.error || "OCR failed")
        return
      }

      // Auto-fill form fields from OCR result
      setForm((f) => ({
        ...f,
        description:     data.description ?? f.description,
        category:        data.category    ?? f.category,
        date:            data.date        ?? f.date,
        submittedAmount: data.amount != null ? String(data.amount) : f.submittedAmount,
        submittedCurrency: data.currency  ?? f.submittedCurrency,
      }))
      setOcrSuccess(true)
    } catch {
      setOcrError("OCR request failed")
    } finally {
      setOcrLoading(false)
    }
  }

  const convertedAmount = form.submittedAmount && form.exchangeRate
    ? (parseFloat(form.submittedAmount) * parseFloat(form.exchangeRate)).toFixed(2)
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Upload receipt first if present
      if (receiptFile) {
        // Receipt will be attached after expense creation
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description:       form.description,
          category:          form.category,
          date:              form.date,
          submittedAmount:   parseFloat(form.submittedAmount),
          submittedCurrency: form.submittedCurrency,
          exchangeRate:      parseFloat(form.exchangeRate),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to create expense")
        setLoading(false)
        return
      }

      const expense = await res.json()

      // Upload receipt if present
      if (receiptFile && expense.id) {
        const fd = new FormData()
        fd.append("file", receiptFile)
        await fetch(`/api/expenses/${expense.id}/receipt`, { method: "POST", body: fd }).catch(() => null)
      }

      router.push("/expenses")
    } catch {
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title="New Expense"
        description="Submit a new expense for approval"
      />

      {/* Receipt OCR card */}
      <Card className="border-dashed border-2 border-border/60">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Preview */}
            {receiptPreview ? (
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={receiptPreview} alt="Receipt" className="w-20 h-20 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => { setReceiptFile(null); setReceiptPreview(null); setOcrSuccess(false) }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors shrink-0"
              >
                <Upload className="w-5 h-5" />
                <span className="text-[10px] font-medium">Upload</span>
              </button>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Receipt Scanning (OCR)</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload a receipt image to auto-fill the form fields.
              </p>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-3.5 h-3.5" />
                  {receiptFile ? "Change file" : "Choose file"}
                </Button>

                {receiptFile && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleOCR}
                    disabled={ocrLoading}
                  >
                    {ocrLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...</>
                    ) : (
                      <><ScanLine className="w-3.5 h-3.5" /> Scan Receipt</>
                    )}
                  </Button>
                )}

                {receiptFile && (
                  <span className="text-xs text-muted-foreground truncate max-w-[160px]">
                    {receiptFile.name}
                  </span>
                )}
              </div>

              {ocrError && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {ocrError}
                </p>
              )}
              {ocrSuccess && (
                <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Fields auto-filled from receipt
                </p>
              )}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </CardContent>
      </Card>

      {/* Expense form */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Business lunch with client"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger id="category"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="submittedAmount">Amount</Label>
                <Input
                  id="submittedAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="100.00"
                  value={form.submittedAmount}
                  onChange={(e) => setForm({ ...form, submittedAmount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="submittedCurrency">Currency</Label>
                <Select
                  value={form.submittedCurrency}
                  onValueChange={(v) => setForm({ ...form, submittedCurrency: v })}
                >
                  <SelectTrigger id="submittedCurrency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Exchange rate row */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="exchangeRate">
                  Exchange Rate
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    ({form.submittedCurrency} → {companyCurrency})
                  </span>
                </Label>
                <button
                  type="button"
                  onClick={() => fetchRate(form.submittedCurrency, companyCurrency)}
                  disabled={rateLoading}
                  className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-3 h-3", rateLoading && "animate-spin")} />
                  Refresh rate
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  placeholder="1.00"
                  value={form.exchangeRate}
                  onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })}
                  required
                  className={cn(rateLoading && "opacity-60")}
                />
                {rateLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
              </div>
              {rateError && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {rateError}
                </p>
              )}
              {rateLastFetched && !rateError && (
                <p className="text-xs text-muted-foreground">Rate fetched at {rateLastFetched}</p>
              )}
            </div>

            {/* Converted amount preview */}
            {convertedAmount && form.submittedCurrency !== companyCurrency && (
              <div className="rounded-lg bg-surface px-4 py-3 text-sm">
                <span className="text-muted-foreground">Converted amount: </span>
                <span className="font-semibold">{companyCurrency} {convertedAmount}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : "Create Expense"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
