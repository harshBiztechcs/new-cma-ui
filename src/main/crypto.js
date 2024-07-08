const crypto = require('crypto');

const password = 'jiEKG3rLcWdu1IO0GKhHLQMrpFaPk2n3';

const decrypt = (input) => {
  try {
    const inputBase64 = input.replace(/\-/g, '+').replace(/_/g, '/');
    const edata = Buffer.from(inputBase64, 'base64').toString('binary');

    const key = crypto.createHash('md5').update(password).digest('hex');
    const iv = crypto
      .createHash('md5')
      .update(`${password}${key}`)
      .digest('hex')
      .slice(0, 16);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let plaintext;

    if (process.version.startsWith('v0.')) {
      const decrypted =
        decipher.update(edata, 'binary', 'utf8') + decipher.final('utf8');
      plaintext = decrypted;
    } else {
      plaintext =
        decipher.update(edata, 'binary', 'utf8') + decipher.final('utf8');
    }

    return { success: true, message: plaintext };
  } catch (error) {
    return { success: false, message: 'CMA connect decryption failed' };
  }
};

const decJObj = (jsonStr) => {
  try {
    const res = decrypt(jsonStr);
    if (res.success) {
      const decodedObj = JSON.parse(res.message);
      return { success: true, message: decodedObj };
    }
    return res;
  } catch (error) {
    return { success: false, message: 'CMA connect decryption failed' };
  }
};

module.exports = {
  decJObj,
};
