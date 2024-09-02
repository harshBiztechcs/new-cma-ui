/* eslint-disable no-console */
const fs = require('fs');
const ffi = require('@lwahonen/ffi-napi');
const { exec } = require('child_process');
const path = require('path');
const { dialog } = require('electron');
const { getAssetPath } = require('../../util');

let MyPrinter = null;
let executablePath = null;

// Set up printer executable path for Windows
if (process.platform === 'win32') {
  executablePath = getAssetPath('SDK', 'zebra-printer');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${executablePath}`;
}

// Load printer functions
const loadPrinterFunctions = () => {
  const dllPath = path.join(executablePath, 'ZplToPrinter.dll');
  try {
    MyPrinter = ffi.Library(dllPath, {
      printZPLToUSBPrinter: ['void', ['string', 'string']],
    });
  } catch (error) {
    console.error('Error loading Label Printer library:', error);
    dialog.showMessageBox(null, {
      title: 'Exposing Label Printer Library Functions',
      message: `Error loading Label Printer library: ${error}. DLL file exists: ${fs.existsSync(dllPath) ? 'yes' : 'no'}.`,
    });
  }
};

// Parse device output from WMIC command
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

// Filter devices by name
function filterDevicesByName(devices, name) {
  return devices.some((device) => device.Name === name);
}

// Check for printer device connection
function checkPrinterDeviceConnection() {
  return new Promise((resolve, reject) => {
    exec(
      'wmic path Win32_PnPEntity get Name,DeviceID,Manufacturer,PNPDeviceID',
      (error, stdout, stderr) => {
        if (error) {
          resolve(false);
          return;
        }

        if (stderr) {
          reject(new Error(`Command stderr: ${stderr}`));
          return;
        }

        const devices = parseDeviceOutput(stdout);
        const isPrinterFound = filterDevicesByName(
          devices,
          'ZDesigner ZD421-203dpi ZPL',
        );
        resolve(isPrinterFound);
      },
    );
  });
}

// Check if the label printer is connected
async function checkLabelPrinterConnection() {
  try {
    const isPrinterFound = await checkPrinterDeviceConnection();
    return { res: isPrinterFound, error: null };
  } catch (error) {
    console.error('Error checking device connection:', error.message);
    return { res: false, error: 'Error checking device connection' };
  }
}

// Handle the printing process
async function handlePrintingProcess(data) {
  try {
    if (!data?.zebra_data?.zpl_data || !data.zebra_data.deviceName) {
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
        reject(new Error(`Failed to print: ${err.message}`));
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
