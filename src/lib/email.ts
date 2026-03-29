import { Resend } from "resend"

let resend: Resend | null = null

function getResendClient() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev"

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  baseUrl: string
) {
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  try {
    const client = getResendClient()
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: email,
      subject: "Reset your password",
      html: `
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
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Failed to send email:", error)
    return { success: false, error: "Failed to send email" }
  }
}
