const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.primary-nav');
menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));
document.getElementById('year').textContent = new Date().getFullYear();

const estimateForm = document.getElementById('estimate-form');
const status = document.getElementById('estimate-status');
const submitButton = estimateForm.querySelector('button[type="submit"]');
const directDelivery = estimateForm.dataset.delivery === 'direct';
let previousPayload;
let requestId;

if (directDelivery) {
  submitButton.textContent = 'Send estimate request ↗';
  document.getElementById('estimate-note').textContent =
    'Send your project details directly to Wilmet Construction.';
}

estimateForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  const { name, phone, email, service, message, website } = Object.fromEntries(
    new FormData(estimateForm),
  );

  if (!directDelivery) {
    const subject = encodeURIComponent(`Estimate request from ${name}`);
    const body = encodeURIComponent(
      `Name: ${name}\nPhone: ${phone}\nEmail: ${email || 'Not provided'}\nService: ${service}\n\nProject details:\n${message}`,
    );
    window.location.href = `mailto:wilmetconstruction@gmail.com?subject=${subject}&body=${body}`;
    return;
  }

  const details = { name, phone, email, service, message, website };
  const payload = JSON.stringify(details);
  if (payload !== previousPayload) {
    previousPayload = payload;
    requestId = crypto.randomUUID();
  }
  submitButton.disabled = true;
  status.textContent = 'Sending your estimate request…';

  try {
    const response = await fetch(estimateForm.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...details, requestId }),
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json();
    if (!response.ok || result.ok !== true) {
      status.textContent = result.message || 'Please try again, or call or email Dante.';
      return;
    }
    estimateForm.reset();
    previousPayload = undefined;
    status.textContent = result.message;
    window.gtag?.('event', 'generate_lead');
  } catch {
    status.textContent = 'We couldn’t confirm your request. Try again, or call or email Dante.';
  } finally {
    submitButton.disabled = false;
  }
});

document.querySelectorAll('a[href^="tel:"]').forEach(link => {
  link.addEventListener('click', () => {
    window.gtag?.('event', 'tap_to_call');
  });
});

// Back to Top Button
const backToTopButton = document.getElementById("backToTop");

window.addEventListener("scroll", () => {
  if (window.scrollY > 400) {
    backToTopButton.classList.add("show");
  } else {
    backToTopButton.classList.remove("show");
  }
});

backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
});

// Carry the selected service into the existing estimate form.
document.querySelectorAll('[data-service]').forEach(link => {
  link.addEventListener('click', () => {
    const select = document.querySelector('#estimate-form select[name="service"]');
    if (select) select.value = link.dataset.service;
  });
});
