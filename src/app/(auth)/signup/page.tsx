"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const CURRENCIES = ["USD","EUR","GBP","INR","JPY","CAD","AUD","SGD","AED","CHF"]

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name:"", email:"", password:"", companyName:"", companyCurrency:"USD" })
  const [error, setError]   = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError("")
    try {
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters")
        setLoading(false)
        return
      }
      if (!/[A-Z]/.test(form.password)) {
        setError("Password must contain at least one uppercase letter")
        setLoading(false)
        return
      }
      if (!/[a-z]/.test(form.password)) {
        setError("Password must contain at least one lowercase letter")
        setLoading(false)
        return
      }
      if (!/[0-9]/.test(form.password)) {
        setError("Password must contain at least one number")
        setLoading(false)
        return
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Signup failed"); setLoading(false); return }
      
      const r = await signIn("credentials", { email: form.email, password: form.password, redirect: false })
      if (r?.error) {
        setError("Account created! Please sign in with your credentials.")
        router.push("/login")
      } else {
        router.push("/dashboard")
      }
    } catch { setError("An error occurred."); setLoading(false) }
  }

  return (
    <div className="o-auth-card" style={{ maxWidth: 440 }}>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-sm">R</span>
        </div>
        <span className="text-[16px] font-bold text-gray-900">Reimbursor</span>
      </div>
      <h1 className="text-[18px] font-bold text-gray-900 mb-1">Create account</h1>
      <p className="text-[12px] text-gray-500 mb-6">Set up your company workspace</p>
      {error && (
        <div className="mb-4 px-3 py-2 rounded border border-red-200 bg-red-50 text-red-700 text-[12px]">{error}</div>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="o-field-label">Your Name</label>
            <input type="text" className="o-input" placeholder="Jane Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="o-field-label">Email</label>
            <input type="email" className="o-input" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
        </div>
        <div>
          <label className="o-field-label">Password</label>
          <input type="password" className="o-input" placeholder="At least 8 characters with uppercase, lowercase, and number" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <p className="mt-1 text-[10px] text-gray-500">Must contain 8+ characters with uppercase, lowercase, and a number</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="o-field-label">Company Name</label>
            <input type="text" className="o-input" placeholder="Acme Inc." value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
          </div>
          <div>
            <label className="o-field-label">Currency</label>
            <select className="o-input" value={form.companyCurrency} onChange={(e) => setForm({ ...form, companyCurrency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full h-9 rounded-md bg-blue-600 text-white text-[13px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 mt-1">
          {loading ? "Creating..." : "Create Account"}
        </button>
      </form>
      <p className="mt-4 text-center text-[12px] text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </div>
  )
}
