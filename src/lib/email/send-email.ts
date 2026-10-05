/**
 * Transactional Email Dispatcher for SAI Books
 * Powered by Resend API with local developer simulation fallback.
 * Bilingual (English + Tamil) responsive email templates.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || "SAI Books <notifications@saitoursandtravels.in>";

  // Local development fallback: Log cleanly without failing
  if (!apiKey || apiKey.startsWith("re_xxx") || process.env.NODE_ENV === "development") {
    if (!apiKey || apiKey.startsWith("re_xxx")) {
      console.log("\x1b[36m%s\x1b[0m", `\n======================================================`);
      console.log("\x1b[33m%s\x1b[0m", `[DEV EMAIL SIMULATION - RESEND KEY NOT CONFIGURED]`);
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body (Plain text):\n${text}`);
      console.log("\x1b[36m%s\x1b[0m", `======================================================\n`);
      return { success: true };
    }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("[RESEND EMAIL ERROR]", res.status, errData);
      return { success: false, error: errData.message || "Failed to deliver email" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[EMAIL DISPATCH EXCEPTION]", err);
    return { success: false, error: err?.message || "Network error sending email" };
  }
}

/**
 * 1. Send 6-Digit Password Reset OTP Email
 */
export async function sendOtpEmail({
  to,
  name,
  otp,
  locale = "ta-IN",
}: {
  to: string;
  name: string;
  otp: string;
  locale?: string;
}) {
  const isTamil = locale.startsWith("ta");
  const subject = isTamil
    ? `[SAI Books] உங்கள் கடவுச்சொல் மீட்டமைப்பு OTP: ${otp}`
    : `[SAI Books] Your Password Reset OTP: ${otp}`;

  // Log in development console ONLY
  if (process.env.NODE_ENV === "development") {
    console.log(
      "\x1b[32m%s\x1b[0m",
      `[DEV AUTH OTP] Email: ${to} | 6-Digit OTP: ${otp} | Expires in 10 minutes`
    );
  }

  const html = `
<!DOCTYPE html>
<html lang="${isTamil ? "ta" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #ea580c, #c2410c); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .content { padding: 32px 24px; }
    .otp-box { background: #fff7ed; border: 2px dashed #f97316; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #c2410c; margin: 0; font-family: 'Courier New', Courier, monospace; }
    .expiry { font-size: 13px; font-weight: 600; color: #9a3412; margin-top: 8px; }
    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 8px; font-size: 13px; color: #991b1b; margin: 20px 0; }
    .footer { border-top: 1px solid #f1f5f9; padding: 20px 24px; font-size: 12px; color: #64748b; text-align: center; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>SAI Books – Tours & Travels</h1>
      <p>Notes & Accounts Portal • Madurai</p>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; margin-top: 0; color: #0f172a;">
        ${isTamil ? `வணக்கம் ${name || "பயனரே"},` : `Hello ${name || "User"},`}
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        ${
          isTamil
            ? "உங்கள் கணக்கிற்கான கடவுச்சொல் மீட்டமைப்பு கோரிக்கை பெறப்பட்டுள்ளது. கீழே உள்ள 6-இலக்க OTP-ஐப் பயன்படுத்தி புதிய கடவுச்சொல்லை அமைக்கவும்:"
            : "We received a request to reset your password for SAI Books. Use the 6-digit One-Time Password (OTP) below to proceed:"
        }
      </p>

      <div class="otp-box">
        <p class="otp-code">${otp}</p>
        <p class="expiry">
          ${isTamil ? "⏱️ இந்த OTP 10 நிமிடங்கள் மட்டுமே செல்லுபடியாகும்" : "⏱️ Valid for 10 minutes only"}
        </p>
      </div>

      <div class="warning">
        <strong>${isTamil ? "பாதுகாப்பு எச்சரிக்கை:" : "Security Alert:"}</strong>
        ${
          isTamil
            ? "இந்த OTP-ஐ எங்கள் ஊழியர்கள் உட்பட எவரிடமும் ஒருபோதும் பகிர வேண்டாம்."
            : "Never share this OTP with anyone, including Sai Tours & Travels staff."
        }
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
        ${
          isTamil
            ? "நீங்கள் இந்தக் கோரிக்கையைச் செய்யவில்லை என்றால், இந்த மின்னஞ்சலைப் புறக்கணிக்கவும். உங்கள் கடவுச்சொல் பாதுகாப்பாக இருக்கும்."
            : "If you did not request this password reset, please ignore this email. Your current password remains safe."
        }
      </p>
    </div>

    <div class="footer">
      <p style="margin: 0;">Sai Tours and Travels • Passport Services & Travel Accounts</p>
      <p style="margin: 4px 0 0 0;">Owner Support: saipassportmdu@gmail.com</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
SAI Books - Sai Tours & Travels
===============================================
${isTamil ? `வணக்கம் ${name || "பயனரே"},` : `Hello ${name || "User"},`}

${
  isTamil
    ? "உங்கள் கடவுச்சொல் மீட்டமைப்பு OTP:"
    : "Your 6-Digit Password Reset OTP is:"
}

[ ${otp} ]

${isTamil ? "- இந்த OTP 10 நிமிடங்கள் மட்டுமே செல்லுபடியாகும்." : "- This OTP is valid for 10 minutes only."}
${isTamil ? "- இந்த OTP-ஐ யாரிடமும் பகிர வேண்டாம்." : "- Never share this OTP with anyone, including our staff."}

${
  isTamil
    ? "நீங்கள் இதை கோரவில்லை என்றால், உடனடியாக saipassportmdu@gmail.com ஐ தொடர்பு கொள்ளவும்."
    : "If you did not request this, please contact saipassportmdu@gmail.com immediately."
}
===============================================
  `.trim();

  return sendEmail({ to, subject, html, text });
}

/**
 * 2. Send Password Changed Confirmation Alert Email
 */
export async function sendPasswordChangedEmail({
  to,
  name,
  locale = "ta-IN",
  ipAddress,
  userAgent,
}: {
  to: string;
  name: string;
  locale?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const isTamil = locale.startsWith("ta");
  const subject = isTamil
    ? `[பாதுகாப்பு எச்சரிக்கை] உங்கள் கடவுச்சொல் மாற்றப்பட்டது - SAI Books`
    : `[Security Alert] Your Password Was Successfully Changed - SAI Books`;

  const timeFormatted = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const html = `
<!DOCTYPE html>
<html lang="${isTamil ? "ta" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; color: #ffffff; }
    .content { padding: 32px 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 12px; font-size: 13px; }
    .info-table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; }
    .danger-box { background: #fef2f2; border: 1px solid #f87171; border-radius: 12px; padding: 16px; font-size: 13px; color: #991b1b; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 style="margin:0; font-size: 20px;">SAI Books – Tours & Travels</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.8;">Security Notification</p>
    </div>
    <div class="content">
      <h2 style="font-size: 17px; margin-top: 0; color: #0f172a;">
        ${isTamil ? `வணக்கம் ${name || "பயனரே"},` : `Hello ${name || "User"},`}
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #334155;">
        ${
          isTamil
            ? "உங்கள் SAI Books கணக்கின் கடவுச்சொல் வெற்றிகரமாக மாற்றப்பட்டது. அனைத்து பழைய அமர்வுகளும் பாதுகாப்பு காரணங்களுக்காக வெளியேற்றப்பட்டுள்ளன."
            : "Your SAI Books account password was recently changed. All previous active sessions have been automatically logged out for your security."
        }
      </p>

      <table class="info-table">
        <tr>
          <td><strong>${isTamil ? "நேரம் (IST):" : "Time (IST):"}</strong></td>
          <td>${timeFormatted}</td>
        </tr>
        <tr>
          <td><strong>${isTamil ? "ஐபி முகவரி:" : "IP Address:"}</strong></td>
          <td>${ipAddress || "Secured"}</td>
        </tr>
        <tr>
          <td><strong>${isTamil ? "சாதனம்:" : "Device:"}</strong></td>
          <td>${userAgent ? userAgent.slice(0, 50) + "..." : "Web Browser"}</td>
        </tr>
      </table>

      <div class="danger-box">
        <strong>${isTamil ? "இது நீங்கள் இல்லை என்றால்:" : "If you did NOT make this change:"}</strong><br/>
        ${
          isTamil
            ? "உடனடியாக தலைமை நிர்வாகியை (Owner) <strong>saipassportmdu@gmail.com</strong> இல் தொடர்பு கொண்டு கணக்கை முடக்கவும்."
            : "Contact the Owner immediately at <strong>saipassportmdu@gmail.com</strong> to secure your account."
        }
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = `
SAI Books - Password Changed Alert
===============================================
Hello ${name || "User"},

Your account password was successfully updated at ${timeFormatted} (IST).
IP: ${ipAddress || "Secured"}

IF THIS WAS NOT YOU, contact saipassportmdu@gmail.com immediately!
===============================================
  `.trim();

  return sendEmail({ to, subject, html, text });
}
