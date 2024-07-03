/* eslint-disable consistent-return */
/* eslint-disable no-console */
const { exec } = require('child_process');
const path = require('path');
const { dialog } = require('electron');
const koffi = require('koffi');
const fs = require('fs');
const { getAssetPath } = require('../../util');

let MyPrinter = null;
let executablePath = null;

// Set up printer executable path for Windows
if (process.platform === 'win32') {
  executablePath = getAssetPath('SDK', 'zebra-printer', 'ZplToPrinter.dll');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${executablePath}`;
}

// all sdk functions related to ci62 needs to expose here first
const loadPrinterFunctions = () => {
  try {
    const myPrinterLibrary = koffi.load(executablePath);

    MyPrinter = {
      GetInterfaceVersion: myPrinterLibrary.func(
        'printZPLToUSBPrinter',
        'void',
        ['string', 'string'],
      ),
    };
  } catch (error) {
    console.error('Error loading ci62 library:', error);
    dialog.showMessageBox(null, {
      title: 'Exposing Ci62 Library Functions',
      message: `Error loading Ci62 library :- ${error.message} && DLL file exists =>${fs.existsSync(executablePath) ? 'yes' : 'no'} `,
    });
    return null; // Return null in case of an error
  }
};

// Connection
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

function filterDevicesByVIDPID(devices, name) {
  return devices.some((device) => device.Name === name);
}

function checkPrinterDeviceConnection() {
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
        const isPrinterFound = filterDevicesByVIDPID(
          devices,
          'ZDesigner ZD421-203dpi ZPL',
        );

        // Resolve with the result
        resolve(isPrinterFound);
      },
    );
  });
}

async function checkLabelPrinterConnection() {
  try {
    const isPrinterFound = await checkPrinterDeviceConnection();
    return { res: isPrinterFound, error: null };
  } catch (error) {
    console.error(error);
    return { res: false, error: 'Error checking device connection' };
  }
}

// Handle printing process
async function handlePrintingProcess(data) {
  try {
    if (
      !data ||
      !data.zebra_data ||
      !data.zebra_data.zpl_data ||
      !data.zebra_data.deviceName
    ) {
      throw new Error(
        'Both printer port name and ZPL content must be provided.',
      );
    }

    return new Promise((resolve, reject) => {
      try {
        MyPrinter.printZPLToUSBPrinter(
          data.zebra_data.deviceName,
          data.zebra_data.zpl_data,
        );
        resolve('Printing ZPL content to USB printer...');
      } catch (err) {
        reject(new Error('Failed to print:', err.message));
      }
    });
  } catch (error) {
    console.error('Error in printing process:', error.message);
    return { res: false, error: error.message };
  }
}

module.exports = {
  loadPrinterFunctions,
  checkLabelPrinterConnection,
  handlePrintingProcess,
};
