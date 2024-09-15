module.exports.authenticationCheck = (request, response, next) => {
    if (!request.isAuthenticated()) {
        request.session.redirectUrl = request.originalUrl
        console.log(request.session.redirectUrl)
        request.flash('error', 'You must be logged in to complete this task!')
        response.redirect('/login')
    } else {
        next();
    }
}

module.exports.saveRedirectUrl = (request, response, next) => {
    response.locals.redirectUrl = request.session.redirectUrl || '/';
    next();
}