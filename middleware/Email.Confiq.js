const nodemailer = require ('nodemailer');

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // use TLS
  requireTLS: true, // force TLS
  auth: {
    user: "my.ticket.flix@gmail.com",
    pass: "juvd iskv eafl pekb",
  },
  tls: {
    rejectUnauthorized: false, // avoid self-signed certificate errors
  },
});

module.exports = transporter;