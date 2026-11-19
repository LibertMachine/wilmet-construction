const services = new Set([
  'New Construction', 'Remodeling', 'Framing', 'Roofing / Siding',
  'Windows / Doors', 'Steel / Fencing', 'Finish Work', 'Decking', 'Other',
]);

export async function onRequestPost({ request, env }) {
  const respond = (status, message) => Response.json(
    { ok: status === 200, message },
    { status, headers: { 'Cache-Control': 'no-store' } },
  );
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return respond(403, 'Please submit the form from the Wilmet Construction website.');
  }
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return respond(415, 'Please use the website estimate form.');
  }
  if (!env.RESEND_API_KEY || !env.ESTIMATE_FROM) {
    return respond(503, 'Online estimates are currently unavailable. Please call or email Dante.');
  }

  let input;
  try {
    const raw = await request.text();
    if (raw.length > 24000) return respond(413, 'Your request is too long.');
    input = JSON.parse(raw);
  } catch {
    return respond(400, 'Please check your details and try again.');
  }

  const read = (field) => typeof input?.[field] === 'string' ? input[field].trim() : '';
  const name = read('name');
  const phone = read('phone');
  const email = read('email');
  const service = read('service');
  const message = read('message');
  const requestId = read('requestId');

  if (read('website')) return respond(400, 'Please check your details and try again.');
  if (!name || name.length > 100 || phone.length > 40 || phone.replace(/[^0-9]/g, '').length < 7 ||
      email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
      !services.has(service) || !message || message.length > 4000 ||
      !/^[a-f0-9-]{36}$/i.test(requestId)) {
    return respond(400, 'Check your contact details and project information, then try again.');
  }

  try {
    const delivery = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `estimate/${requestId}`,
      },
      body: JSON.stringify({
        from: env.ESTIMATE_FROM,
        to: [env.ESTIMATE_TO || 'wilmetconstruction@gmail.com'],
        subject: `Website estimate request — ${service}`,
        text: `Name: ${name}\nPhone: ${phone}\nEmail: ${email || 'Not provided'}\nService: ${service}\n\nProject details:\n${message}`,
        ...(email ? { reply_to: email } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (delivery.ok) return respond(200, 'Your estimate request was sent. Thank you!');
  } catch {
    // Keep contact details out of logs and let the visitor retry.
  }

  return respond(502, 'We couldn’t confirm your request. Try again, or call or email Dante.');
}
