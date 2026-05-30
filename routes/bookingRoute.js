const express = require("express");
const router  = express.Router();
const QRCode  = require("qrcode");
const Booking = require("../models/booking");
const Event   = require("../models/event");
const auth    = require("../middleware/auth");
const jwt     = require("jsonwebtoken");
const User    = require("../models/user");
// Brevo transactional email is sent over its HTTPS REST API (port 443),
// which works on Railway where outbound SMTP is blocked. No SDK needed.
async function sendBrevoEmail({ to, subject, html }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn("BREVO_API_KEY not set — skipping email send.");
    return;
  }
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method:  "POST",
      headers: {
        "accept":       "application/json",
        "content-type": "application/json",
        "api-key":      process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name:  process.env.SENDER_NAME || "Eventify",
          email: process.env.SENDER_EMAIL,
        },
        to:          [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (!resp.ok) {
      const detail = await resp.text();
      console.error("Brevo send failed:", resp.status, detail);
    }
  } catch (err) {
    console.error("Brevo send error:", err.message);
  }
}

function canCancelEvent(event) {
  if (!event || !event.startDate) return true;
  return new Date(event.startDate).getTime() > Date.now();
}

function formatDate(date) {
  if (!date) return "Date TBA";
  return new Date(date).toLocaleString("en-US", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
    hour:    "2-digit",
    minute:  "2-digit",
  });
}

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString() + " EGP";
}

// ─── QR CODE BOOKING CONFIRMATION EMAIL ───────────────────────────────────────
async function sendBookingConfirmation(booking, event) {
  if (!process.env.BREVO_API_KEY) return;

  try {
    // The QR encodes a link to a public ticket page. Scanning it opens the page
    // in a phone browser and shows the holder + event details and live status.
    // The token is a signed JWT, so the link can't be guessed or tampered with.
    const ticketToken = jwt.sign(
      { bookingId: String(booking._id), purpose: "ticket" },
      process.env.JWT_SECRET,
      { expiresIn: "60d" }
    );
    const baseUrl   = (process.env.CLIENT_URL || "").replace(/\/+$/, "");
    const ticketUrl = `${baseUrl}/api/bookings/verify/${ticketToken}`;

    // The QR image is served by our own /qr/:token endpoint as a normal https
    // <img> URL, so it renders reliably in every mail client (no inline/CID).
    const qrImageUrl = `${baseUrl}/api/bookings/qr/${ticketToken}`;

    const bookingRef = String(booking._id).slice(-6).toUpperCase();

    await sendBrevoEmail({
      to:      booking.user,
      subject: `Your ticket for ${booking.event} — Booking #${bookingRef}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#111;">

  <div style="max-width:600px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d3d22 0%,#1a6639 100%);border-radius:18px 18px 0 0;padding:32px 36px 28px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Your Event Dashboard</p>
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
        <span style="color:#27ae60;">&#9679;</span> Eventify
      </h1>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:36px;border:1px solid #e0ebe5;border-top:none;">

      <h2 style="margin:0 0 6px;color:#0d3d22;font-size:22px;font-weight:700;">Booking Confirmed!</h2>
      <p style="margin:0 0 28px;color:#7a9186;font-size:14px;">Here are your ticket details. Show the QR code at the venue entrance.</p>

      <!-- Event details card -->
      <div style="background:#f7f9f8;border:1px solid #dce8e1;border-radius:14px;padding:24px;margin-bottom:28px;">

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;width:140px;">Event</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;">${booking.event}</td>
          </tr>
          ${event.startDate ? `
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Date &amp; Time</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${formatDate(event.startDate)}</td>
          </tr>` : ""}
          ${event.venue ? `
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Venue</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${event.venue}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Booking Ref</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">#${bookingRef}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Tickets</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${booking.tickets}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Payment</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${booking.paymentMethod.toUpperCase()} — ${booking.paymentStatus.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Amount</td>
            <td style="padding:8px 0;color:#0d3d22;font-size:15px;font-weight:700;border-top:1px solid #e0ebe5;">${formatAmount(booking.amount)}</td>
          </tr>
        </table>

      </div>

      <!-- QR code section -->
      <div style="text-align:center;background:#0d3d22;border-radius:14px;padding:28px 24px;">
        <p style="margin:0 0 6px;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Scan at Entrance</p>
        <p style="margin:0 0 20px;color:#ffffff;font-size:16px;font-weight:700;">Your Eventify Ticket</p>

        <!-- Inline QR code image (attached as PNG, embedded via cid) -->
        <img
          src="${qrImageUrl}"
          alt="QR Code for Booking #${bookingRef}"
          width="200"
          height="200"
          style="border-radius:12px;display:block;margin:0 auto;"
        />

        <p style="margin:16px 0 0;color:rgba(255,255,255,0.55);font-size:12px;">Booking #${bookingRef}</p>
      </div>

      ${booking.paymentMethod === "cash" ? `
      <!-- Cash payment notice -->
      <div style="margin-top:20px;background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:16px 20px;">
        <p style="margin:0;color:#92400e;font-size:13px;">
          <strong>Cash payment pending.</strong> Please pay at your nearest Eventify store within 24 hours to confirm your ticket.
        </p>
      </div>` : ""}

    </div>

    <!-- Footer -->
    <div style="background:#f7f9f8;border:1px solid #e0ebe5;border-top:none;border-radius:0 0 18px 18px;padding:20px 36px;text-align:center;">
      <p style="margin:0;color:#7a9186;font-size:12px;">
        This ticket was issued by <strong style="color:#1d7a46;">Eventify</strong>. Do not share your QR code with others.
      </p>
    </div>

  </div>

</body>
</html>
      `,
    });
  } catch (err) {
    console.error("Could not send booking confirmation email:", err.message);
  }
}

// ─── BOOKING CANCELLATION EMAIL ───────────────────────────────────────────────
async function sendCancellationEmail(booking, event) {
  if (!process.env.BREVO_API_KEY) return;

  try {
    const bookingRef = String(booking._id).slice(-6).toUpperCase();
    const isRefunded = booking.paymentStatus === "refunded";

    await sendBrevoEmail({
      to:      booking.user,
      subject: `Booking cancelled — ${booking.event} #${bookingRef}`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;color:#111;">

  <div style="max-width:600px;margin:32px auto;padding:0 16px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0d3d22 0%,#1a6639 100%);border-radius:18px 18px 0 0;padding:32px 36px 28px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Your Event Dashboard</p>
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">
        <span style="color:#27ae60;">&#9679;</span> Eventify
      </h1>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:36px;border:1px solid #e0ebe5;border-top:none;">

      <h2 style="margin:0 0 6px;color:#b91c1c;font-size:22px;font-weight:700;">Booking Cancelled</h2>
      <p style="margin:0 0 28px;color:#7a9186;font-size:14px;">Your booking has been successfully cancelled. Details below.</p>

      <!-- Cancelled booking details -->
      <div style="background:#f7f9f8;border:1px solid #dce8e1;border-radius:14px;padding:24px;margin-bottom:28px;">

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;width:140px;">Event</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;">${booking.event}</td>
          </tr>
          ${event && event.startDate ? `
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Date &amp; Time</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${formatDate(event.startDate)}</td>
          </tr>` : ""}
          ${event && event.venue ? `
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Venue</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${event.venue}</td>
          </tr>` : ""}
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Booking Ref</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">#${bookingRef}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Tickets</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${booking.tickets}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Amount</td>
            <td style="padding:8px 0;color:#111c17;font-size:13px;font-weight:700;border-top:1px solid #e0ebe5;">${formatAmount(booking.amount)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a9186;font-size:13px;border-top:1px solid #e0ebe5;">Status</td>
            <td style="padding:8px 0;border-top:1px solid #e0ebe5;">
              <span style="background:#fee2e2;color:#b91c1c;font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;">CANCELLED</span>
            </td>
          </tr>
        </table>

      </div>

      <!-- Refund notice -->
      ${isRefunded ? `
      <div style="background:#e6f4ec;border:1px solid #c3e4cf;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;color:#0d3d22;font-size:13px;">
          <strong>Refund initiated.</strong> Your payment of ${formatAmount(booking.amount)} will be returned to your original payment method within 5–10 business days.
        </p>
      </div>` : `
      <div style="background:#f7f9f8;border:1px solid #dce8e1;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
        <p style="margin:0;color:#3d5247;font-size:13px;">
          No charge was made for this booking since payment was pending.
        </p>
      </div>`}

      <p style="margin:0;color:#7a9186;font-size:13px;">
        If you cancelled by mistake or have questions, please visit your dashboard and rebook, or contact Eventify support.
      </p>

    </div>

    <!-- Footer -->
    <div style="background:#f7f9f8;border:1px solid #e0ebe5;border-top:none;border-radius:0 0 18px 18px;padding:20px 36px;text-align:center;">
      <p style="margin:0;color:#7a9186;font-size:12px;">
        This notice was sent by <strong style="color:#1d7a46;">Eventify</strong>.
      </p>
    </div>

  </div>

</body>
</html>
      `,
    });
  } catch (err) {
    console.error("Could not send cancellation email:", err.message);
  }
}

// ─── PUBLIC TICKET PAGE (opened by scanning the QR) ──────────────────────────

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTicketShell(innerHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Eventify Ticket</title>
</head>
<body style="margin:0;padding:24px 16px;background:#f5f7fa;font-family:Arial,Helvetica,sans-serif;color:#111c17;">
  <div style="max-width:480px;margin:0 auto;">
    ${innerHtml}
    <p style="text-align:center;color:#7a9186;font-size:12px;margin-top:24px;">
      Issued by <strong style="color:#1d7a46;">Eventify</strong>. Present this page at the entrance.
    </p>
  </div>
</body>
</html>`;
}

function renderTicketMessage(title, message, color) {
  return renderTicketShell(`
    <div style="background:#fff;border:1px solid #e0ebe5;border-radius:18px;padding:36px;text-align:center;">
      <h1 style="margin:0 0 10px;color:${color};font-size:22px;font-weight:700;">${escapeHtml(title)}</h1>
      <p style="margin:0;color:#7a9186;font-size:14px;">${escapeHtml(message)}</p>
    </div>`);
}

function renderTicketPage({ booking, event, user }) {
  const bookingRef  = String(booking._id).slice(-6).toUpperCase();
  const isCancelled = booking.bookingStatus === "cancelled";

  const statusBadge = isCancelled
    ? `<span style="background:#fee2e2;color:#b91c1c;font-size:13px;font-weight:700;padding:5px 14px;border-radius:999px;">CANCELLED</span>`
    : `<span style="background:#dcfce7;color:#15803d;font-size:13px;font-weight:700;padding:5px 14px;border-radius:999px;">VALID</span>`;

  const row = (label, value) => value
    ? `<tr>
         <td style="padding:10px 0;color:#7a9186;font-size:13px;border-top:1px solid #eef3f0;width:130px;">${escapeHtml(label)}</td>
         <td style="padding:10px 0;color:#111c17;font-size:14px;font-weight:700;border-top:1px solid #eef3f0;">${escapeHtml(value)}</td>
       </tr>`
    : "";

  const dateStr = event && event.startDate ? formatDate(event.startDate) : "Date TBA";

  return renderTicketShell(`
    <div style="background:linear-gradient(135deg,#0d3d22 0%,#1a6639 100%);border-radius:18px 18px 0 0;padding:28px 32px;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.55);font-size:11px;letter-spacing:0.12em;text-transform:uppercase;">Eventify Ticket</p>
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${escapeHtml(booking.event)}</h1>
      <div style="margin-top:14px;">${statusBadge}</div>
    </div>

    <div style="background:#fff;border:1px solid #e0ebe5;border-top:none;border-radius:0 0 18px 18px;padding:28px 32px;">

      <p style="margin:0 0 6px;color:#7a9186;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Ticket Holder</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px;">
        ${row("Name",  user && user.name)}
        ${row("Email", (user && user.email) || booking.user)}
        ${row("Phone", user && user.phone)}
      </table>

      <p style="margin:0 0 6px;color:#7a9186;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;">Event &amp; Booking</p>
      <table style="width:100%;border-collapse:collapse;">
        ${row("Date & Time", dateStr)}
        ${row("Venue",       event && event.venue)}
        ${row("Booking Ref", "#" + bookingRef)}
        ${row("Tickets",     String(booking.tickets))}
        ${row("Payment",     `${booking.paymentMethod.toUpperCase()} — ${booking.paymentStatus.toUpperCase()}`)}
        ${row("Amount",      formatAmount(booking.amount))}
      </table>

      ${isCancelled ? `
      <div style="margin-top:22px;background:#fee2e2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;">
        <p style="margin:0;color:#b91c1c;font-size:13px;"><strong>This booking has been cancelled</strong> and is no longer valid for entry.</p>
      </div>` : ""}

    </div>`);
}

// verify + display a ticket — PUBLIC (the token in the URL is the credential)
router.get("/verify/:token", async (req, res) => {
  try {
    let payload;
    try {
      payload = jwt.verify(req.params.token, process.env.JWT_SECRET);
    } catch {
      return res
        .status(400)
        .send(renderTicketMessage("Invalid ticket", "This ticket link is invalid or has expired.", "#b91c1c"));
    }

    if (payload.purpose !== "ticket" || !payload.bookingId) {
      return res
        .status(400)
        .send(renderTicketMessage("Invalid ticket", "This link is not a valid ticket.", "#b91c1c"));
    }

    const booking = await Booking.findById(payload.bookingId);
    if (!booking) {
      return res
        .status(404)
        .send(renderTicketMessage("Not found", "We couldn't find this booking.", "#b91c1c"));
    }

    const [event, user] = await Promise.all([
      Event.findById(booking.eventId),
      booking.userId
        ? User.findById(booking.userId).select("name email phone")
        : User.findOne({ email: booking.user }).select("name email phone"),
    ]);

    res
      .status(200)
      .set("Content-Type", "text/html; charset=utf-8")
      .send(renderTicketPage({ booking, event, user }));
  } catch (err) {
    res
      .status(500)
      .send(renderTicketMessage("Error", "Something went wrong loading this ticket.", "#b91c1c"));
  }
});

// serve the QR PNG for a ticket — PUBLIC (encodes the verify link above)
router.get("/qr/:token", async (req, res) => {
  try {
    jwt.verify(req.params.token, process.env.JWT_SECRET);
    const baseUrl   = (process.env.CLIENT_URL || "").replace(/\/+$/, "");
    const ticketUrl = `${baseUrl}/api/bookings/verify/${req.params.token}`;
    const png = await QRCode.toBuffer(ticketUrl, {
      width:  280,
      margin: 2,
      color:  { dark: "#0d3d22", light: "#ffffff" },
    });
    res.set("Content-Type", "image/png");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch {
    res.status(400).end();
  }
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// fetch bookings
router.get("/", auth, async (req, res) => {
  try {
    const filter = req.user.isAdmin ? {} : { userId: req.user.id };
    const bookings = await Booking.find(filter);
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// fetch booking by id
router.get("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!req.user.isAdmin && booking.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// create booking
router.post("/", auth, async (req, res) => {
  try {
    const { eventId, tickets, paymentMethod } = req.body;

    const ticketCount = Number(tickets);

    if (!Number.isInteger(ticketCount) || ticketCount < 1) {
      return res.status(400).json({ message: "Invalid number of tickets" });
    }

    if (!["cash", "card"].includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    const existingEvent = await Event.findOneAndUpdate(
      { _id: eventId, available: { $gte: ticketCount } },
      { $inc: { available: -ticketCount } },
      { returnDocument: "after" }
    );

    if (!existingEvent) {
      const eventExists = await Event.exists({ _id: eventId });
      return res.status(eventExists ? 400 : 404).json({
        message: eventExists ? "Not enough available seats" : "Event not found",
      });
    }

    const booking = new Booking({
      userId:        req.user.id,
      user:          req.user.email,
      eventId,
      event:         existingEvent.name,
      tickets:       ticketCount,
      paymentMethod,
      paymentStatus: paymentMethod === "card" ? "paid" : "pending",
      amount:        existingEvent.price * ticketCount,
    });

    try {
      await booking.save();
    } catch (err) {
      await Event.findByIdAndUpdate(eventId, { $inc: { available: ticketCount } });
      throw err;
    }

    // send QR ticket email — non-blocking, never fails the booking
    await sendBookingConfirmation(booking, existingEvent);

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// cancel booking
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!req.user.isAdmin && booking.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (booking.bookingStatus === "cancelled") {
      return res.status(400).json({ message: "Booking is already cancelled" });
    }

    const event = await Event.findById(booking.eventId);

    if (!req.user.isAdmin && !canCancelEvent(event)) {
      return res.status(400).json({
        message: "Bookings can only be cancelled before the event starts",
      });
    }

    if (event) {
      event.available = Math.min(event.seats, event.available + booking.tickets);
      await event.save();
    }

    booking.bookingStatus = "cancelled";
    booking.paymentStatus = booking.paymentStatus === "paid" ? "refunded" : "cancelled";
    booking.cancelledAt   = new Date();

    await booking.save();

    // send cancellation email — non-blocking
    await sendCancellationEmail(booking, event);

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// edit booking (admin only)
router.put("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!req.user.isAdmin) return res.status(403).json({ message: "Unauthorized" });

    const allowedUpdates = ["paymentMethod", "paymentStatus"];
    const updates = {};

    for (const field of allowedUpdates) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (updates.paymentMethod) {
      updates.paymentStatus = updates.paymentMethod === "card" ? "paid" : "pending";
    }

    const updated = await Booking.findByIdAndUpdate(
      req.params.id,
      updates,
      { returnDocument: "after", runValidators: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// update booking payment status (admin only)
router.put("/:id/status", auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Admins only" });

    const { paymentStatus } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({ message: "Payment status is required" });
    }

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { returnDocument: "after", runValidators: true }
    );

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// delete booking
router.delete("/:id", auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (!req.user.isAdmin && booking.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const event = await Event.findById(booking.eventId);

    if (!req.user.isAdmin && !canCancelEvent(event)) {
      return res.status(400).json({
        message: "Bookings can only be cancelled before the event starts",
      });
    }

    // restore seats if booking was still active
    if (event && booking.bookingStatus !== "cancelled") {
      event.available = Math.min(event.seats, event.available + booking.tickets);
      await event.save();
    }

    if (!req.user.isAdmin) {
      booking.bookingStatus = "cancelled";
      booking.paymentStatus = booking.paymentStatus === "paid" ? "refunded" : "cancelled";
      booking.cancelledAt   = new Date();
      await booking.save();

      // send cancellation email — non-blocking
      await sendCancellationEmail(booking, event);

      return res.json(booking);
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.json({ message: "Booking deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;