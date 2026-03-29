import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 })
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY

    if (!openaiKey) {
      return NextResponse.json(
        { error: "OCR not configured — set OPENAI_API_KEY in environment" },
        { status: 503 }
      )
    }

    // Convert file to base64
    const bytes  = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString("base64")
    const mimeType = file.type === "application/pdf" ? "image/jpeg" : file.type

    const prompt = `You are an expense receipt parser. Extract the following fields from this receipt image and return ONLY valid JSON with no markdown or explanation:
{
  "description": "merchant name or brief description of purchase",
  "amount": number (the total amount paid, as a number),
  "currency": "3-letter ISO currency code (e.g. USD, EUR, GBP)",
  "date": "YYYY-MM-DD format",
  "category": one of: "TRAVEL" | "MEALS" | "ACCOMMODATION" | "TRANSPORTATION" | "SUPPLIES" | "EQUIPMENT" | "OTHER",
  "merchant": "merchant/vendor name"
}

Rules:
- If a field cannot be determined, use null
- For amount, use the final total (after tax)
- For currency, infer from symbols ($ = USD, € = EUR, £ = GBP, ₹ = INR, ¥ = JPY) or text
- For category: restaurants/cafes = MEALS, hotels = ACCOMMODATION, flights/trains = TRAVEL, taxis/uber = TRANSPORTATION, office supplies = SUPPLIES
- Return ONLY the JSON object, nothing else`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64}`,
                  detail: "low",
                },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("OpenAI OCR error:", err)
      return NextResponse.json({ error: "OCR service error" }, { status: 502 })
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content?.trim()

    if (!content) {
      return NextResponse.json({ error: "No OCR result" }, { status: 502 })
    }

    // Strip markdown code fences if present
    const cleaned = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()

    let parsed: {
      description?: string | null
      amount?: number | null
      currency?: string | null
      date?: string | null
      category?: string | null
      merchant?: string | null
    }

    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: "Could not parse OCR result" }, { status: 502 })
    }

    const validCategories = ["TRAVEL", "MEALS", "ACCOMMODATION", "TRANSPORTATION", "SUPPLIES", "EQUIPMENT", "OTHER"]

    return NextResponse.json({
      description: parsed.description ?? parsed.merchant ?? null,
      amount:      typeof parsed.amount === "number" ? parsed.amount : null,
      currency:    typeof parsed.currency === "string" && parsed.currency.length === 3 ? parsed.currency.toUpperCase() : null,
      date:        parsed.date ?? null,
      category:    parsed.category && validCategories.includes(parsed.category) ? parsed.category : "OTHER",
      merchant:    parsed.merchant ?? null,
    })
  } catch (error) {
    console.error("OCR route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
