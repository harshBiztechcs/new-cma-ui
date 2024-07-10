const { exec } = require('child_process');
const os = require('os');

export const getCurrentDateTime = () => {
  const date = new Date();
  const day = date.getDate() < 10 ? `0${date.getDate()}` : date.getDate();
  const month =
    date.getMonth() + 1 < 10 ? `0${date.getMonth() + 1}` : date.getMonth() + 1;
  const year = date.getFullYear().toString().substr(-2);
  return `${date.toLocaleTimeString()} ${[day, month, year].join('/')}`;
};

export const getLocalIp = () => {
  for (let addresses of Object.values(os.networkInterfaces())) {
    for (let add of addresses) {
      if (add.address.startsWith('192.168.')) {
        return add.address;
      }
    }
  }
};

export const listSystemUSBDevices = () => {
  return new Promise((resolve, reject) => {
    let command;
    switch (os.platform()) {
      case 'win32':
        command = 'wmic path Win32_USBControllerDevice get Dependent';
        break;
      case 'darwin':
        command = 'system_profiler SPUSBDataType';
        break;
      case 'linux':
        command = 'lsusb';
        break;
      default:
        reject(new Error('Unsupported operating system'));
        return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};
