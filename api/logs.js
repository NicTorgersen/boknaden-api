var shared      = require('./_shared'),
    Log      = shared.models.log

function getLogs (req, res) {
    let isadmin

    if (req.hasOwnProperty('user_token')) {
        isadmin = req.user_token.isadmin
    }

    if (isadmin || parseInt(process.env.DEBUG) === 1) {
        Log.findAll({
            order: 'createddate DESC'
        })
        .then(function (logs) {
            res.json(logs)
        }).catch(function (err) {
            shared.logger.log('getLogs', 'From: ' + req.ip + '. ' + err, 'error')
        })
    } else {
        shared.logger.log('getLogs', 'Someone is trying to access the logs with their invalid token.', 'info')
        res.status(401).json({
            message: 'What are you trying to do? :)',
            success: false,
        })
    }
}

module.exports = {
    get: getLogs,
    requiresAuth: {
        'GET': true,
    }
}
