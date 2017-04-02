var shared  = require('./_shared.js'),
    bcrypt  = shared.bcrypt,
    User    = shared.models.user,
    Ad      = shared.models.ad,
    AdItem  = shared.models.aditem,
    Image   = shared.models.image,
    Course  = shared.models.course,
    Campus  = shared.models.campus,
    University = shared.models.university

function getUsers (req, res) {
    shared.logger.log('getUsers', "From: " + req.ip)

    let atts = ["userid", "username", "firstname", "lastname"]

    if (req.user_token) {
        atts.push("email")
    }

    if (req.query.username) {
        return User.findOne({
            attributes: atts,
            include: [
                {
                    model: Ad,
                    include: [{ model: AdItem }, {
                        model: Course,
                        include: [{
                            model: Campus,
                            include: [{
                                model: University
                            }]
                        }]
                    }]
                }
            ],
            where: {
                username: req.query.username
            }
        }).then(function (user) {
            res.json(user)
        }).catch(function (err) {
            shared.logger.log('getUsers', 'From: ' + req.ip + ". " + err, 'error')
            console.log(err)
            res.status(404).send({err: 'An error happened'})
        })
    }

    return User.findAll({
        attributes: atts,
    }).then(function (users) {
        res.json(users)
    }).catch(function (err) {
        shared.logger.log('getUsers', 'From: ' + req.ip + ". " + err, 'error')
        console.log(err)
        res.status(404).send({err: 'An error happened'})
    })

}

function newUser (req, res) {
    var fields          = ["username", "passphrase", "courseid", "email", "phone", "firstname", "lastname"]
    var valuesNotEmpty  = shared.checkEmptyValues(req.body, fields)

    shared.logger.log('newUser', "From: " + req.ip)

    if (!valuesNotEmpty) {
        res.json({err: 'Not all parameters specified.'})
        return
    }

    User.find({
        where: {
            $or: [
                {username: req.body.username.trim()},
                {email: req.body.email.trim()}
            ]
        }
    }).then(function (user) {

        if (!user) {
            bcrypt.hash(req.body.passphrase, req.boknaden.config.security.saltRounds, function (err, hash) {
                if (err) {
                    shared.logger.log('newUser-hashing', 'From: ' + req.ip + ". " + err, 'error')
                    res.status(500).json({err: 'An error happened while generating safe password.'})
                }
                User.create({
                    username: req.body.username.trim(),
                    passphrase: hash,
                    email: req.body.email.trim(),
                    phone: parseInt(req.body.phone),
                    firstname: req.body.firstname.trim(),
                    lastname: req.body.lastname.trim(),
                    courseid: parseInt(req.body.courseid),
                    universityid: 1,
                }).then(function (user) {
                    res.json(user)
                }).catch(function (err) {
                    console.log(err)
                    shared.logger.log('newUser', 'From: ' + req.ip + ". " + err, 'error')
                    res.json({err: 'An error happened while creating the user.'})
                })
            })
        } else {
            res.json({err: "User already exists."})
        }

    }).catch(function (err) {
        shared.logger.log('newUser', 'From: ' + req.ip + ". " + err, 'error')
        console.log(err)
        res.status(404).json({err: 'An error happened'})
    })

}

module.exports = {
    get: getUsers,
    post: newUser,
    requiresAuth: {
        'GET': false,
        'POST': false,
    }
}
