const crypto = require('crypto');

const password = 'jiEKG3rLcWdu1IO0GKhHLQMrpFaPk2n3';

const decrypt = (input) => {
  try {
    // Convert urlsafe base64 to normal base64
    const base64Input = input.replace(/-/g, '+').replace(/_/g, '/');
    // Convert from base64 to binary string
    const edata = Buffer.from(base64Input, 'base64');

    // Create key from password
    const key = crypto.createHash('md5').update(password).digest();
    // Create iv from password and key
    const iv = crypto
      .createHash('md5')
      .update(password + key)
      .digest();

    // Decipher encrypted data
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      key,
      iv.slice(0, 16),
    );

    let decrypted = decipher.update(edata, 'binary', 'utf8');
    decrypted += decipher.final('utf8');

    return { success: true, message: decrypted };
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
