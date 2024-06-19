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

module.exports = { getLogInfo };
