interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ to, subject, body }: SendEmailParams) {
  // Mock email sender — logs to console in development
  console.log("\n========== MOCK EMAIL ==========");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body:\n${body}`);
  console.log("================================\n");

  return { success: true, message: "Email logged to console (mock)" };
}
