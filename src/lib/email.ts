import nodemailer from "nodemailer"

interface EmailOptions {
  to: string
  subject: string
  html: string
}

let transporter: nodemailer.Transporter | null = null

function createTransporter() {
  const host = process.env.SMTP_HOST
  const port = parseInt(process.env.SMTP_PORT || "587")
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM || "noreply@reimbursor.app"

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    })
  }

  return null
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || "noreply@reimbursor.app"
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html } = options

  if (!transporter) {
    transporter = createTransporter()
  }

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: getFromAddress(),
        to,
        subject,
        html,
      })
      console.log(`Email sent to ${to}: ${info.messageId}`)
      return { success: true }
    } catch (error) {
      console.error("Failed to send email:", error)
      return { success: false, error: "Failed to send email" }
    }
  }

  console.warn("No SMTP configuration found. Email not sent.")
  console.log(`Would have sent email to: ${to}`)
  console.log(`Subject: ${subject}`)
  return { success: false, error: "SMTP not configured" }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const html = `
    <h1>Password Reset Request</h1>
    <p>You requested a password reset for your Reimbursor account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0;">
      Reset Password
    </a>
    <p>Or copy and paste this URL into your browser:</p>
    <p style="word-break: break-all;">${resetUrl}</p>
    <p><strong>This link will expire in 1 hour.</strong></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `

  return sendEmail({
    to: email,
    subject: "Reset your password",
    html,
  })
}
