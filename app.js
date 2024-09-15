const express = require('express');
const expressLayout = require('express-ejs-layouts');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const User = require('./server/models/User.js');
const methodOverride = require('method-override');

const app = express();
const port = process.env.PORT || 3000;

require('dotenv').config();

// Body parser middleware to parse incoming form data
app.use(express.urlencoded({ extended: true }));

// Static files middleware for serving files from "public" directory
app.use(express.static('public'));

// EJS layouts middleware
app.use(expressLayout);

// Cookie parser middleware (before session middleware since cookies are used for sessions)
app.use(cookieParser('CookBookClub'));

// Session middleware (must be placed before passport.session)
app.use(session({
    secret: "CookBookClubSecretSession",
    saveUninitialized: true,
    resave: true
}));

// Flash middleware for showing success/error messages
app.use(flash());

// Allows method overriding via query string
app.use(methodOverride('_method')); 

// Passport initialization and session handling
app.use(passport.initialize());
app.use(passport.session());

// Express file upload middleware for handling file uploads
app.use(fileUpload());

// Middleware to make the current user available in views (should come after passport.session)
app.use((request, response, next) => {
    response.locals.currentUser = request.user;
    response.locals.success = request.flash('success'); //stroing for success message
    response.locals.error = request.flash('error'); //storing for error message
    response.locals.redirectUrl="/";
    next();
});

// Passport configuration
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' },
    async (email, password, done) => {
        console.log('Im inside the local strategy');
        try {
            const user = await User.findOne({ email });
            if (!user) {
                console.log('The username is incorrect');
                return done(null, false, { message: 'Incorrect username.' });
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                console.log('The password is incorrect!');
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Set EJS as the view engine and configure layouts
app.set('view engine', 'ejs');
app.set('layout', './layouts/main');

// Routes (should come after middleware setup)
const routes = require('./server/routes/recipeRoutes.js');
app.use('/', routes);

// Start the server
app.listen(port, () => {
    console.log(`Listening to port ${port}`);
});
