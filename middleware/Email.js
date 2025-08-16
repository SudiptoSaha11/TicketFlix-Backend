const  transporter = require ('./Email.Confiq.js')
const { Verification_Email_Template, Welcome_Email_Template } = require ('./EmailTemplate.js');


const sendVerificationEmail=async(email,verificationCode)=>{
    try {
     const response=   await transporter.sendMail({
            from: '"Ticket Flix Team" <icedebojitcool059@gmail.com>',

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
            from: '"Ticket Flix" <icedebojitcool059@gmail.com>',

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

module.exports = {sendVerificationEmail, senWelcomeEmail};