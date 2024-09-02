/* eslint-disable consistent-return */
const { exec } = require('child_process');

// Function to parse the output and extract device information
function parseDeviceOutput(output) {
  return output
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [deviceId, manufacturer, name] = line.trim().split(/\s{2,}/);
      const [, VID, PID] =
        deviceId.match(/VID_([A-F0-9]+)&PID_([A-F0-9]+)/) || [];
      return {
        Name: name,
        DeviceID: deviceId,
        Manufacturer: manufacturer,
        VID,
        PID,
      };
    });
}

// Function to check if any device matches the name, VID, and PID
function isDeviceConnected(devices, name, vid, pid) {
  return devices.some(
    (device) =>
      device.Name === name && device.VID === vid && device.PID === pid,
  );
}

function checkScannerDeviceConnection() {
  return new Promise((resolve, reject) => {
    exec(
      'wmic path Win32_PnPEntity get Name,DeviceID,Manufacturer,PNPDeviceID',
      (error, stdout, stderr) => {
        if (error) return resolve(false);
        if (stderr) return reject(new Error(`Command stderr: ${stderr}`));

        const devices = parseDeviceOutput(stdout);
        const isHIDKeyboardFound = isDeviceConnected(
          devices,
          'HID Keyboard Device',
          '05E0',
          '1200',
        );

        resolve(isHIDKeyboardFound);
      },
    );
  });
}

module.exports = {
  checkScannerDeviceConnection,
};
