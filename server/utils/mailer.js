require('dotenv').config(); 
const nodemailer = require('nodemailer');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
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
