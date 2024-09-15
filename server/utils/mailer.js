require('dotenv').config(); // Make sure you're using environment variables for sensitive data
const nodemailer = require('nodemailer');


// Create a reusable transporter object
console.log(process.env.EMAIL_USER + "  "+ process.env.EMAIL_PASS)

const transporter = nodemailer.createTransport({
    service: 'gmail', // or use 'smtp' if you have another email service
    auth: {
        user: process.env.EMAIL_USER, // Your email address (e.g. cookBookClub@gmail.com)
        pass: process.env.EMAIL_PASS, // Your email password or app-specific password for Gmail
    },
});

// Function to send a welcome email
const sendWelcomeEmail = async (toEmail, username) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: toEmail,
        subject: 'Welcome to CookBookClub!',
        text: `Hello ${username},\n\nWelcome to CookBookClub! We're excited to have you here.\n\nBest regards,\nCookBookClub Team`,
        html: `<h3>Hello ${username},</h3>
               <p>Welcome to <b>CookBookClub</b>! We're excited to have you here.</p>
               <p>Best regards,<br>CookBookClub Team</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent successfully!');
    } catch (error) {
        console.error('Error sending welcome email:', error);
    }
};

module.exports = { sendWelcomeEmail };
