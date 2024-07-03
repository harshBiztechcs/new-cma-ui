const { exec } = require('child_process');

// Function to parse the output and extract device information
function parseDeviceOutput(output) {
  return output
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [deviceId, manufacturer, name] = line.trim().split(/\s{2,}/);
      // Extract VID and PID from DeviceID
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

// Function to filter devices based on name, VID, and PID
function filterDevicesByVIDPID(devices, name, vid, pid) {
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
        if (error) {
          // Set the response to false if an error occurs
          resolve(false);
          return;
        }

        if (stderr) {
          reject(new Error(`Command stderr: ${stderr}`));
          return;
        }

        // Parse the output
        const devices = parseDeviceOutput(stdout);

        // Check if any device matches the criteria
        const isHIDKeyboardFound = filterDevicesByVIDPID(
          devices,
          'HID Keyboard Device',
          '05E0',
          '1200',
        );

        // Resolve with the result
        resolve(isHIDKeyboardFound);
      },
    );
  });
}

async function checkBarcodeScannerConnection() {
  try {
    const isHIDKeyboardFound = await checkScannerDeviceConnection();
    return { res: isHIDKeyboardFound, error: null };
  } catch (error) {
    return { res: false, error: 'Error checking device connection' };
  }
}

module.exports = {
  checkBarcodeScannerConnection,
};
