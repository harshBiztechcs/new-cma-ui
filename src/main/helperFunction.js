const axios = require('axios');

const getLogInfo = ({
  timeStamp,
  duration = '-',
  client = '-',
  method = '-',
  url = '-',
  parameters = '-',
  status = '-',
  result = '-',
}) => {
  const currentDate = new Date();

  return {
    timeStamp,
    date: currentDate.toISOString().split('T')[0],
    time: currentDate.toLocaleTimeString(),
    duration,
    client,
    method,
    url,
    parameters:
      parameters && typeof parameters === 'object'
        ? JSON.stringify(parameters)
        : parameters,
    status,
    result,
  };
};

const isOnline = async (url) => {
  try {
    const response = await axios.get(url, { timeout: 7000 });
    return response.status >= 200 && response.status < 300;
  } catch (error) {
    return false;
  }
};

const urls = [
  'http://www.google.com',
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
