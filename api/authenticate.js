var shared  = require('./_shared.js'),
    bcrypt  = require('bcrypt'),
    User    = shared.models.user,
    Course  = shared.models.course
    Campus  = shared.models.campus,
    University = shared.models.university

/* Godtar to strenger, et brukernavn og et passord. */
function authenticate (req, res) {
    var username     = req.body.username,
        passphrase   = req.body.passphrase

    /* Verifisér at kombinasjonen eksisterer. Brukernavn kan også vær en e-postadresse. */
    User.findOne({
        attributes: ["userid", "username", "passphrase", "firstname", "lastname", "email", "isadmin", "verified"],
        where: { $or: [ {username: username}, {email: username} ] },
        include: [
            { model: Course, include: [
                { model: Campus, include: [
                    { model: University } ]
                } ]
            } ]
    }).then(function (user) {
        if (user) {
            // Sammenligner passordet lagret i databasen med klartekst-passordet brukeren sendte inn
            // ved hjelp av bcrypt
            bcrypt.compare(passphrase, user.passphrase, function (err, authed) {
                if (err) { // Error kan skje dersom bcrypt-biblioteket ikke er riktig installert, eller av andre merkelige grunner
                    shared.logger.log('authenticate', 'From ' + user.get('username') + '. ' + err, 'error')
                    res.status(500).json({
                        success: false,
                        message: 'An error happened (0).'
                    })
                    return
                }

                if (!authed) {
                    shared.logger.log('authenticate', 'Login attempt for ' + user.get('username') + ' failed.')
                    return res.status(401).json({
                        success: false,
                        message: 'Feil brukernavn eller passord.' // av sikkerhetsmessige grunner røper vi ikke hvilken del av nøklene som er feil
                    })
                }

                shared.logger.log('authenticate', 'User ' + user.get('username') + ' authenticated.')

                // Definerer brukerdata slik at de kan signeres med JWT.
                var userObject = {
                    userid: user.get('userid'),
                    username: user.get('username'),
                    email: user.get('email'),
                    verified: user.get('verified'),
                    firstname: user.get('firstname'),
                    lastname: user.get('lastname'),
                    course: user.get('course'),
                    isadmin: user.get('isadmin'),
                }

                var token = req.service.jwt.sign(userObject, req.boknaden.config.security.secret, {
                    expiresIn: req.boknaden.config.security.tokenExpiration,
                })

                return res.json({
                    success: true,
                    token: token,
                })
            })

        } else {
            res.status(401).json({
                success: false,
                message: 'Feil brukernavn eller passord.'
            })
        }
    }).catch(function (err) {
        shared.logger.log('authenticate', 'From: ' + req.ip + '. ' + err, 'error')
        console.log(err)
        return res.json({err: 'Error happened while processing authentication'})
    })
}

module.exports = {
    post: authenticate,
    requiresAuth: {
        'post': false,
    }
}
