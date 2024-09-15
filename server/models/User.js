const mongoose = require('mongoose');
const validator = require('validator')

// Define the User schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: 'This field is required',
        validate: {
            validator: (v) => { return validator.isEmail(v); },
            message: `This is not a valid email address!`
        }
    },
    password: {
        type: String,
        required: true
    },
});

const User = mongoose.model('User', userSchema);

module.exports = User;
