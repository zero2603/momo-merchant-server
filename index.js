const express = require('express');
const bodyParser = require('body-parser');
var cors = require('cors');
var request = require('request-promise');
const NodeRSA = require('node-rsa');
const crypto = require('crypto');
var CronJob = require('cron').CronJob;
var dotenv = require('dotenv');
dotenv.config({ path: './.env' });

const BASE_URL = 'https://test-payment.momo.vn';

// const user = require('./routes/user');
// const post = require('./routes/post');
// const comment = require('./routes/comment');
// const bookmark = require('./routes/bookmark');
// const notification = require('./routes/notification');

const app = express();
app.use(cors())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.post('/payment', function (req, res) {
    var data = req.body;

    const key = new NodeRSA('-----BEGIN PUBLIC KEY-----' + process.env.PUBLIC_KEY + '-----END PUBLIC KEY-----', { encryptionScheme: 'pkcs1' });
    const jsonData = {
        "partnerCode": process.env.MERCHANT_ID,
        "partnerRefId": data.orderId,
        "amount": data.amount
    };
    const hash = key.encrypt(JSON.stringify(jsonData), 'base64');

    var body = {
        partnerCode: process.env.MERCHANT_ID,
        partnerRefId: data.orderId,
        customerNumber: data.customerNumber,
        appData: data.data,
        hash: hash,
        version: '2.0',
        payType: 3
    }

    return request({
        method: "POST",
        uri: BASE_URL + '/pay/app',
        json: true,
        body: body
    }).then(function (parsedBody) {
        res.send(parsedBody)
    }).catch(function (err) {
        res.send(err)
    });
});

app.post('/notification', function (req, res) {
    var data = req.body;

    var string = `amount=${data.amount}&message=${data.message}&momoTransId=${data.momoTransId}&partnerRefId=${data.partnerRefId}&status=${data.status}`
    var signature = crypto.createHmac('sha256', process.env.SECRET_KEY).update(string).digest('hex');

    res.send({
        status: 0,
        message: "Thành công",
        amount: data.amount,
        partnerRefId: data.partnerRefId,
        momoTransId: data.momoTransId,
        signature: signature
    })
});

app.post('/confirm', function (req, res) {
    var data = req.body;

    var string = `partnerCode=${process.env.MERCHANT_ID}&partnerRefId=${data.partnerRefId}&requestType=${data.requestType}&momoTransId=${data.momoTransId}&requestId=${data.requestId}`
    var signature = crypto.createHmac('sha256', process.env.SECRET_KEY).update(string).digest('hex');

    var body = {
        partnerCode: process.env.MERCHANT_ID,
        partnerRefId: data.partnerRefId,
        requestType: data.requestType,
        requestId: data.requestId,
        customerNumber: data.customerNumber,
        description: data.description,
        signature: signature
    };

    return request({
        method: "POST",
        uri: BASE_URL + '/pay/confirm',
        json: true,
        body: body
    }).then(function (parsedBody) {
        res.send(parsedBody)
    }).catch(function (err) {
        res.send(err)
    });
});

app.get('/', function (req, res) {
    res.send("Welcome to Momo Merchant Server!");
});

var job = new CronJob('* */15 * * * *', function () {
    return request('https://secret-taiga-14580.herokuapp.com/').then(data => {
        console.log(data)
    })
}, null, true, 'America/Los_Angeles');
job.start();

app.listen(process.env.PORT || 3000, () => console.log('Momo Merchant Server is running!'));