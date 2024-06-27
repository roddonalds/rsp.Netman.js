const fs = require('fs');
const QRReader = require('qrcode-reader');
const Jimp = require('jimp');

async function readQRCodeFromBase64 (base64String) {

    try {

        const buffer = Buffer.from(base64String, 'base64');
        const image = await Jimp.read(buffer);
        const qr = new QRReader();

        return new Promise((resolve, reject) => {
            qr.callback = (err, value) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(value.result);
                }
            };
            qr.decode(image.bitmap);
        });
    } catch (err) {
        throw new Error(`Error reading QR code: ${err.message}`);
    }
}

module.exports = readQRCodeFromBase64;