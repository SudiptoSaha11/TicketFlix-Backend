const Verification_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              color: #333;
              line-height: 1.8;
          }
          .verification-code {
              display: block;
              margin: 20px 0;
              font-size: 22px;
              color: #4CAF50;
              background: #e8f5e9;
              border: 1px dashed #4CAF50;
              padding: 10px;
              text-align: center;
              border-radius: 5px;
              font-weight: bold;
              letter-spacing: 2px;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Verify Your Email</div>
          <div class="content">
              <p>Hello, {name}</p>
              <p>Thank you for signing up! Please confirm your email address by entering the code below:</p>
              <span class="verification-code">{verificationCode}</span>
              <p>If you did not create an account, no further action is required. If you have any questions, feel free to contact our support team.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Ticket Flix. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;




const Welcome_Email_Template = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Community</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
              color: #333;
          }
          .container {
              max-width: 600px;
              margin: 30px auto;
              background: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
              overflow: hidden;
              border: 1px solid #ddd;
          }
          .header {
              background-color: #007BFF;
              color: white;
              padding: 20px;
              text-align: center;
              font-size: 26px;
              font-weight: bold;
          }
          .content {
              padding: 25px;
              line-height: 1.8;
          }
          .welcome-message {
              font-size: 18px;
              margin: 20px 0;
          }
          .button {
              display: inline-block;
              padding: 12px 25px;
              margin: 20px 0;
              background-color: #007BFF;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              text-align: center;
              font-size: 16px;
              font-weight: bold;
              transition: background-color 0.3s;
          }
          .button:hover {
              background-color: #0056b3;
          }
          .footer {
              background-color: #f4f4f4;
              padding: 15px;
              text-align: center;
              color: #777;
              font-size: 12px;
              border-top: 1px solid #ddd;
          }
          p {
              margin: 0 0 15px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">Welcome to Our Community!</div>
          <div class="content">
              <p class="welcome-message">Hello {name},</p>
              <p>We’re thrilled to have you join us! Your registration was successful, and we’re committed to providing you with the best experience possible.</p>
              <p>Here’s how you can get started:</p>
              <ul>
                  <li>Explore our features and customize your experience.</li>
                  <li>Stay informed by checking out our blog for the latest updates and tips.</li>
                  <li>Reach out to our support team if you have any questions or need assistance.</li>
              </ul>
              <a href="#" class="button">Get Started</a>
              <p>If you need any help, don’t hesitate to contact us. We’re here to support you every step of the way.</p>
          </div>
          <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Ticket Flix. All rights reserved.</p>
          </div>
      </div>
  </body>
  </html>
`;
const booking_confirmation = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Booking Confirmation</title>
  <style>
    body { font-family: Arial, sans-serif; background:#f5f5f5; margin:0; padding:0; }
    .container { max-width:600px; margin:20px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
    .header { background:#d32f2f; padding:15px; text-align:center; color:#fff; font-size:20px; font-weight:bold; }
    .subheader { text-align:center; padding:10px; font-size:14px; color:#2e7d32; font-weight:bold; }
    .booking-info { padding:20px; }
    .movie-title { font-size:18px; font-weight:bold; margin-bottom:10px; }
    .detail { font-size:14px; margin:4px 0; }
    .highlight { font-weight:bold; color:#000; }
    .seats { margin-top:10px; font-size:15px; font-weight:bold; }
    .order-summary { background:#fafafa; border-top:1px solid #ddd; padding:20px; }
    .order-summary h3 { margin:0 0 10px; font-size:16px; border-bottom:1px solid #ddd; padding-bottom:5px; }
    .row { display:flex; justify-content:space-between; font-size:14px; margin:6px 0; }
    .total { font-weight:bold; font-size:15px; }
    .footer { font-size:12px; color:#777; text-align:center; padding:15px; border-top:1px solid #eee; }
    .qr { text-align:center; margin:15px 0; }
    .qr img { width:120px; height:120px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Your Booking is Confirmed!</div>
    <div class="subheader">Booking ID: {{bookingCode}}</div>

    <div class="booking-info">
      <div class="movie-title">{{Name}} ({{certification}})</div>
      <div class="detail"><span class="highlight">{{Time}}</span> | {{BOOKING_DATE}}</div>
      <div class="detail">{{Venue}}</div>
      <div class="seats">Seats: {{SEATS}}</div>
    </div>

    <div class="qr">
      <p>Show this QR code at the entrance</p>
      <img src="{{QR_CODE}}" alt="Ticket QR Code" />
    </div>

    <div class="order-summary">
      <h3>ORDER SUMMARY</h3>
      <div class="row"><span>Ticket Amount</span><span>₹{{TICKET_AMOUNT}}</span></div>
      <div class="row"><span>Convenience Fee</span><span>₹{{CONVENIENCE_FEE}}</span></div>
      <div class="row total"><span>Amount Paid</span><span>₹{{FINAL_AMOUNT}}</span></div>
    </div>

    <div class="booking-info">
      <div class="detail"><strong>Booking Date & Time:</strong> {{CREATED_AT}}</div>
    </div>

    <div class="footer">
      <p>Enjoy your show 🎬🍿<br>
      This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
`;

const getTicketTemplate = (booking, qrImage) => {
    return `
    <html>
    <head>
      <style>
        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: #f5f5f5;
        }
        .ticket {
          width: 380px;
          background: #fff;
          border-radius: 12px;
          overflow: hidden;
          margin: auto;
          border: 2px solid #000;
        }
        .header {
          background: #000;
          color: #fff;
          font-size: 12px;
          padding: 6px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .poster {
          width: 100%;
          height: 180px;
          object-fit: cover;
        }
        .details {
          padding: 12px;
          font-size: 14px;
        }
        .title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin: 10px 0;
          font-size: 13px;
        }
        .label {
          font-weight: bold;
          color: #444;
        }
        .qr {
          text-align: center;
          margin: 12px 0;
        }
        .qr img {
          width: 100px;
          height: 100px;
        }
        .footer {
          background: #fafafa;
          font-size: 11px;
          color: #555;
          text-align: center;
          padding: 10px;
          border-top: 1px dashed #ddd;
        }
        .brand {
          text-align: center;
          font-size: 12px;
          margin-top: 4px;
        }
        .brand span {
          color: orange;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="ticket">
        <div class="header">
          <span>Booking ID: ${booking.bookingCode}</span>
          <span>${booking.certification}</span>
        </div>
        <img class="poster" src="${booking.poster}" />
        <div class="details">
          <div class="title">${booking.Name}</div>
          <div class="meta">
            <div><span class="label">Date:</span><br/>${new Date(booking.bookingDate).toDateString()}</div>
            <div><span class="label">Time:</span><br/>${booking.Time}</div>
          </div>
          <div class="meta">
            <div><span class="label">Venue:</span><br/>${booking.Venue}</div>
            <div><span class="label">Seats:</span><br/>${booking.seats.join(", ")}</div>
          </div>
          <div class="qr">
            <img src="${qrImage}" />
            <p style="font-size:12px; margin:4px 0;">${booking.bookingCode}</p>
          </div>
        </div>
        <div class="footer">
          This transaction can be cancelled up to 4 hour(s) before the show as per cinema policy.
          <div class="brand">Ticket<span>Flix</span> M-Ticket</div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

module.exports = { Verification_Email_Template, Welcome_Email_Template, booking_confirmation, getTicketTemplate};