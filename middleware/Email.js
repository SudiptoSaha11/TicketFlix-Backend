const  transporter = require ('./Email.Confiq.js')
const { Verification_Email_Template, Welcome_Email_Template, getTicketTemplate } = require ('./EmailTemplate.js');
const QRCode = require ('qrcode');
const { booking_confirmation } = require ('./EmailTemplate.js');
const puppeteer = require ('puppeteer');

const sendVerificationEmail=async(email,verificationCode)=>{
    try {
     const response=   await transporter.sendMail({
            from: '"Ticket Flix Team" <my.ticket.flix@gmail.com>',

            to: email, // list of receivers
            subject: "Welcome to Ticket Flix! Please verify your email", // Subject line
            text: "Verify your Email", // plain text body
            html: Verification_Email_Template.replace("{verificationCode}",verificationCode)
        })
        console.log('Email send Successfully',response)
    } catch (error) {
        console.log('Email error',error)
    }
}
const senWelcomeEmail=async(email,name)=>{
    try {
     const response=   await transporter.sendMail({
            from: '"Ticket Flix" <my.ticket.flix@gmail.com>',

            to: email, // list of receivers
            subject: "Welcome Email", // Subject line
            text: "Welcome Email", // plain text body
            html: Welcome_Email_Template.replace("{name}",name)
        })
        console.log('Email send Successfully',response)
    } catch (error) {
        console.log('Email error',error)
    }
}

const generateTicketImage = async (booking, qrImage) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    const html = getTicketTemplate(booking, qrImage);
    await page.setContent(html, { waitUntil: "networkidle0" });

    await page.waitForSelector(".ticket", { timeout: 3000 });

    const ticketElement = await page.$(".ticket");
    const buffer = await ticketElement.screenshot({ type: "jpeg" });

    await browser.close();
    return buffer;
  } catch (err) {
    console.error("❌ Failed to generate ticket image:", err);
    return null; // fallback
  }
}




const sendBookingEmail = async (booking) => {
  // Generate QR
  const qrImage = await QRCode.toDataURL(
    `Booking:${booking.bookingCode}|Seats:${booking.seats.join(", ")}`
  );

  // Generate Ticket JPG
  const ticketImageBuffer = await generateTicketImage(booking, qrImage);
  console.log(
    "✅ Ticket JPG generated:",
    ticketImageBuffer?.length || 0,
    "bytes"
  );

  // Fill HTML email body
  const html = booking_confirmation
    .replace("{{bookingCode}}", booking.bookingCode)
    .replace("{{Name}}", booking.Name)
    .replace("{{certification}}", booking.certification || "")
    .replace("{{Time}}", booking.Time)
    .replace(
      "{{BOOKING_DATE}}",
      new Date(booking.bookingDate).toDateString()
    )
    .replace("{{Venue}}", booking.Venue)
    .replace("{{SEATS}}", booking.seats.join(", "))
    .replace("{{QR_CODE}}", qrImage)
    .replace("{{TICKET_AMOUNT}}", booking.totals.subtotal.toFixed(2))
    .replace(
      "{{CONVENIENCE_FEE}}",
      booking.totals.convenienceFee.total.toFixed(2)
    )
    .replace("{{FINAL_AMOUNT}}", booking.totals.finalPayable.toFixed(2))
    .replace("{{CREATED_AT}}", new Date(booking.createdAt).toLocaleString());

  // Attachments → only if JPG generated
  const attachments = [];
  if (ticketImageBuffer) {
    attachments.push({
      filename: `Ticket-${booking.bookingCode}.jpg`,
      content: ticketImageBuffer,
      contentType: "image/jpeg",
    });
  }

  // Send Email
  await transporter.sendMail({
    from: `"Ticket Flix" <${process.env.SMTP_USER}>`,
    to: booking.userEmail,
    subject: `🎟️ Booking Confirmed - ${booking.Name}`,
    html,
    attachments,
  });

  console.log("📧 Booking email sent to", booking.userEmail);
};


module.exports = {sendVerificationEmail, senWelcomeEmail, sendBookingEmail};