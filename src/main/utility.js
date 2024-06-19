export const getCurrentDateTime = () => {
  const date = new Date();
  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
  const month =
    date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
  const year = date.getFullYear().toString().substr(-2);
  return `${date.toLocaleTimeString()} ${[day, month, year].join('/')}`;
};

export const getLocalIp = () => {
  const os = require('os');

  for (let addresses of Object.values(os.networkInterfaces())) {
    for (let add of addresses) {
      if (add.address.startsWith('192.168.')) {
        return add.address;
      }
    }
  }
};
