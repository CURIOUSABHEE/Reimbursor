"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send } from "lucide-react"
import { cn } from "@/lib/utils"

interface Contact {
  id: string
  name: string
  role: string
  email: string
}

interface Message {
  id: string
  message: string
  senderId: string
  createdAt: string
  sender: { id: string; name: string }
}

function ChatContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeUserId = searchParams.get("with")

  const [contacts, setContacts] = useState<Contact[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [contactsLoaded, setContactsLoaded] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  // Load contacts once
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((data) => {
        setContacts(Array.isArray(data) ? data : [])
        setContactsLoaded(true)
      })
      .catch(() => setContactsLoaded(true))
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!activeUserId) return
    try {
      const res = await fetch(`/api/chat?with=${activeUserId}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data)) setMessages(data)
    } catch {
      // ignore polling errors
    }
  }, [activeUserId])

  // Reset messages and fetch when conversation changes
  useEffect(() => {
    setMessages([])
    fetchMessages()
    inputRef.current?.focus()
  }, [activeUserId, fetchMessages])

  // Poll every 3s
  useEffect(() => {
    if (!activeUserId) return
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [activeUserId, fetchMessages])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim() || !activeUserId || sending) return

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      message: text.trim(),
      senderId: session?.user.id ?? "",
      createdAt: new Date().toISOString(),
      sender: { id: session?.user.id ?? "", name: session?.user.name ?? "" },
    }

    setMessages((prev) => [...prev, optimisticMsg])
    setText("")
    setSending(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeUserId, message: optimisticMsg.message }),
      })
      if (res.ok) {
        // Replace optimistic with real data
        await fetchMessages()
      }
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function selectContact(id: string) {
    router.push(`/chat?with=${id}`, { scroll: false })
  }

  const activeContact = contacts.find((c) => c.id === activeUserId)

  const roleBadge: Record<string, "default" | "secondary" | "outline"> = {
    ADMIN: "default",
    MANAGER: "secondary",
    EMPLOYEE: "outline",
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] border rounded-lg overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col shrink-0">
        <div className="p-4 border-b font-semibold text-sm text-foreground">Team Chat</div>
        <div className="flex-1 overflow-y-auto">
          {!contactsLoaded && (
            <p className="p-4 text-xs text-muted-foreground">Loading...</p>
          )}
          {contactsLoaded && contacts.length === 0 && (
            <p className="p-4 text-xs text-muted-foreground">No teammates found</p>
          )}
          {contacts.map((c) => (
            <button
              key={c.id}
              onClick={() => selectContact(c.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent transition-colors",
                activeUserId === c.id && "bg-accent"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>{c.name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <Badge variant={roleBadge[c.role] ?? "outline"} className="text-xs mt-0.5">
                  {c.role}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3 shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{activeContact.name[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{activeContact.name}</p>
                <p className="text-xs text-muted-foreground">{activeContact.email}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 && (
                <p className="text-center text-xs text-muted-foreground pt-8">
                  No messages yet. Say hi!
                </p>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === session?.user.id
                const isTemp = msg.id.startsWith("temp-")
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted rounded-bl-sm",
                        isTemp && "opacity-60"
                      )}
                    >
                      <p className="break-words">{msg.message}</p>
                      <p className={cn("text-xs mt-1 opacity-60", isMe ? "text-right" : "text-left")}>
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2 shrink-0">
              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..."
                autoComplete="off"
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={sending || !text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a person to start chatting
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense>
      <ChatContent />
    </Suspense>
  )
}
