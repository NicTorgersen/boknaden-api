var shared      = require('./_shared.js'),
    Ad          = shared.models.ad,
    AdItem      = shared.models.aditem,
    User        = shared.models.user,
    Course      = shared.models.course,
    University  = shared.models.university,
    Image       = shared.models.image

function getAds (req, res) {
    var q           = req.query,
        course      = parseInt(q.course) || undefined,
        university  = parseInt(q.university) || undefined,
        limit       = parseInt(q.limit) || 20,
        page        = parseInt(q.page) || 1,
        offset      = (page - 1) * limit,

        suppliedWhere  = {deleted: 0},
        userAttributes = ['username', 'firstname', 'lastname']

    shared.logger.log('getAds', 'From: ' + req.ip)
    if (q.userid && !isNaN(parseInt(q.userid))) {
        suppliedWhere.userid = q.userid
    }

    if (req.user_token) {
        userAttributes.push('email')
    }

    if (q.adid && typeof parseInt(q.adid) === 'number') {
        Ad.findOne({
            where: {
                adid: parseInt(q.adid),
                deleted: 0,
            },
            include: [{
                model: User,
                attributes: userAttributes,
            }, {
                model: AdItem,
                include: [
                    {
                        model: Image
                    }
                ]
            }, {
                model: Course,
                attributes: ['courseid', 'coursename'],
                include: [
                    {
                        model: University
                    }
                ]
            }],
        }).then(function (ad) {
            if (!ad) {
                res.status(404).json({success: false, message: 'Not found.'})
                return
            }

            res.json(ad)
        }).catch(function (err) {
            shared.logger.log('getAds', 'From: ' + req.ip + '. ' + err, 'error')
            console.log(err)
            res.status(500).send({err: 'An error happened'})
        })
        return
    }

    Ad.findAndCountAll({
        limit: limit,
        offset: offset,
        order: 'createddate DESC',
        where: suppliedWhere,
        include: [
            {
                model: User,
                attributes: userAttributes,
            }, {
                model: AdItem,
                include: [
                    {
                        model: Image
                    }
                ]
            }, {
                model: Course,
                attributes: ['courseid', 'coursename'],
                include: [
                    {
                        model: University
                    }
                ]
            }
        ],
    }).then(function (ads) {
        var payload = {
            limit: limit,
            offset: offset,
            count: ads.rows.length,
            ads: ads.rows,
        }
        res.json(payload)
    }).catch(function (err) {
        shared.logger.log('getAds', 'From: ' + req.ip + '. ' + err, 'error')
        console.log(err)
        res.status(500).send({err: 'An error happened'})
    })
}

function newAd (req, res) {
    var q               = req.body,
        fields          = ["courseid", "adname"],
        course          = parseInt(q.courseid),
        valuesNotEmpty  = shared.checkEmptyValues(q, fields),
        aditems         = q.aditems

    shared.logger.log('newAd', 'From: ' + req.ip)

    console.log(q)

    if (q.hasOwnProperty('adid')) {
        newAdItem(req, res)
        return
    }

    if (!valuesNotEmpty) {
        res.status(404).send({err: 'Not all parameters specified.'})
        return
    }

    Ad.create({
        userid: req.user_token.userid,
        courseid: course,
        adname: q.adname.trim(),
        text: q.text || null
    }).then(function (ad) {

        newAdItem(req, res, ad.adid, q.aditems).then(function (aditem) {
            res.json({message: 'Added aditem with aditems', ad: ad})
        }).catch(function (err) {
            shared.logger.log('newAdItem', 'From: ' + req.ip + '. ' + err, 'error')
            console.log(err)
            res.status(404).send({err: 'An error happened'})
        })

    }).catch(function (err) {
        shared.logger.log('newAd', 'From: ' + req.ip + '. ' + err, 'error')
        console.log(err)
        res.status(404).send({err: 'An error happened'})
    })
}

function newAdItem (req, res, adid, newAdItems) {
    var q               = req.body,
        description     = q.description || null,
        fields          = ["text", "price"],
        valuesNotEmpty  = false,
        itemsToInsert   = []

    for (var i = 0; i < newAdItems.length; i++) {
        var aditem = newAdItems[i]
        valuesNotEmpty = shared.checkEmptyValues(aditem, fields)

        for (k in aditem) {
            if (aditem.hasOwnProperty(k)) {
                var value = aditem[k]

                if (typeof value === 'string') {
                    aditem[k] = value.trim()
                }

            }
        }

        if (!valuesNotEmpty) {
            res.status(404).send({err: 'Not all parameters for aditem ' + aditem.text + ' specified.'})
            return
        }

        aditem.userid = req.user_token.userid
        aditem.adid = adid
    }

    itemsToInsert = newAdItems

    shared.logger.log('newAdItem', 'From: ' + req.ip)

    // {
    //     userid: req.user_token.userid,
    //     description: description,
    //     adid: adid,
    //     price: price,
    //     text: q.text.trim(),
    //     description: description,
    //     isbn: isbn,
    // }

    return AdItem.bulkCreate(itemsToInsert)

}

function updateAd (req, res) {

}

function deleteAd (req, res) {
    if (req.user_token) {
        var adid = req.body.adid || null

        shared.logger.log('deleteAd', 'From: ' + req.ip)

        if ( !isNaN(parseInt(adid)) ) {
            Ad.findOne({
                where: {
                    adid: parseInt(adid),
                    userid: req.user_token.userid
                }
            }).then(function (ad) {
                if (ad) {
                    ad.set('deleted', 1)

                    return ad.save()
                } else {
                    res.status(404).json({success: false, message: 'Couldn\'t verify your integrity.'})
                }
            }).then(function (update) {
                res.json(update)
            }).catch(function (err) {
                shared.logger.log('deleteAd', 'From: ' + req.ip + '. ' + err, 'error')
                res.status(500).json({success: false, message: 'An error happened while updating.'})
            })
            return
        }
    }
    res.status(403).json({success: false, message: 'Authenticate pls'})
}

module.exports = {
    get: getAds,
    post: newAd,
    put: updateAd,
    delete: deleteAd,
    requiresAuth: {
        'GET': false,
        'POST': true,
        'PUT': true,
        'DELETE': true,
    }
}
