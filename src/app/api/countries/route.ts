import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch(
      "https://restcountries.com/v3.1/all?fields=name,currencies,cca2",
      { next: { revalidate: 86400 } } // cache 24h
    )

    if (!res.ok) throw new Error("restcountries fetch failed")

    const data: {
      cca2: string
      name: { common: string }
      currencies?: Record<string, { name: string; symbol: string }>
    }[] = await res.json()

    const countries = data
      .filter((c) => c.currencies && Object.keys(c.currencies).length > 0)
      .map((c) => ({
        code: c.cca2,
        name: c.name.common,
        currency: Object.keys(c.currencies!)[0],
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({ countries })
  } catch {
    // Fallback list if restcountries is unavailable
    const fallback = [
      { code: "US", name: "United States",   currency: "USD" },
      { code: "GB", name: "United Kingdom",  currency: "GBP" },
      { code: "DE", name: "Germany",         currency: "EUR" },
      { code: "FR", name: "France",          currency: "EUR" },
      { code: "IN", name: "India",           currency: "INR" },
      { code: "JP", name: "Japan",           currency: "JPY" },
      { code: "CA", name: "Canada",          currency: "CAD" },
      { code: "AU", name: "Australia",       currency: "AUD" },
      { code: "SG", name: "Singapore",       currency: "SGD" },
      { code: "AE", name: "United Arab Emirates", currency: "AED" },
      { code: "CH", name: "Switzerland",     currency: "CHF" },
      { code: "BR", name: "Brazil",          currency: "BRL" },
      { code: "MX", name: "Mexico",          currency: "MXN" },
      { code: "ZA", name: "South Africa",    currency: "ZAR" },
      { code: "NG", name: "Nigeria",         currency: "NGN" },
    ]
    return NextResponse.json({ countries: fallback })
  }
}
