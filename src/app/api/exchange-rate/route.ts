import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get("from")?.toUpperCase()
  const to   = searchParams.get("to")?.toUpperCase()

  if (!from || !to) {
    return NextResponse.json({ error: "from and to are required" }, { status: 400 })
  }

  if (from === to) {
    return NextResponse.json({ rate: 1 })
  }

  const apiKey = process.env.EXCHANGE_RATE_API_KEY

  try {
    // Try exchangerate-api.com (free tier: 1500 req/month, no key needed for open endpoint)
    const url = apiKey
      ? `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${from}/${to}`
      : `https://open.er-api.com/v6/latest/${from}`

    const res = await fetch(url, { next: { revalidate: 3600 } }) // cache 1h

    if (!res.ok) throw new Error("exchange rate fetch failed")

    const data = await res.json()

    let rate: number
    if (apiKey) {
      rate = data.conversion_rate
    } else {
      rate = data.rates?.[to]
    }

    if (!rate) throw new Error(`No rate found for ${from}→${to}`)

    return NextResponse.json({ rate: Number(rate.toFixed(6)), from, to })
  } catch {
    return NextResponse.json(
      { error: `Could not fetch exchange rate for ${from}→${to}` },
      { status: 502 }
    )
  }
}
