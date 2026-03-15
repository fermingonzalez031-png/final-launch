export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[SMS SKIPPED] To: ${to} | Body: ${body}`)
    return false
  }
  try {
    const twilio = require('twilio')
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    await client.messages.create({
      body,
      from: process.env.TWILIO_FROM_NUMBER,
      to,
    })
    return true
  } catch (err) {
    console.error('[SMS ERROR]', err)
    return false
  }
}

export function buildOrderSMS(type: string, orderNumber: string, extra = ''): string {
  const msgs: Record<string, string> = {
    new_request:       `New Prodrop request ${orderNumber}. ${extra}`,
    supplier_confirmed:`Part confirmed for order ${orderNumber}. Driver being assigned. ${extra}`,
    driver_assigned:   `Driver assigned for order ${orderNumber}. ${extra}`,
    picked_up:         `Your part has been picked up — order ${orderNumber}. ${extra}`,
    en_route:          `Driver en route for order ${orderNumber}. ${extra}`,
    delivered:         `Order ${orderNumber} delivered! ${extra}`,
    issue:             `Issue with order ${orderNumber}. Our dispatcher is on it. ${extra}`,
  }
  return msgs[type] || `Order ${orderNumber} status update. ${extra}`
}
