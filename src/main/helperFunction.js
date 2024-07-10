/* eslint-disable no-nested-ternary */
const axios = require('axios');

// helper function
const getLogInfo = (
  timeStamp,
  duration,
  client,
  method,
  url,
  parameters,
  status,
  result,
) => ({
  timeStamp,
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString(),
  duration: duration ?? '-',
  client: client ?? '-',
  method: method ?? '-',
  url: url ?? '-',
  parameters: parameters
    ? typeof parameters === 'object'
      ? JSON.stringify(parameters)
      : parameters
    : '-',
  status: status ?? '-',
  result: result ?? '-',
});

const isOnline = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 7000 });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    return false;
  }
};

const urls = [
  'https://www.google.com',
  'https://en.wikipedia.org',
  'https://api.github.com',
  'https://www.youtube.com',
  'https://www.reddit.com',
];

async function hasInternetConnection() {
  return (await Promise.all(urls.map(isOnline))).some(Boolean);
}

module.exports = {
  getLogInfo,
  hasInternetConnection,
};
