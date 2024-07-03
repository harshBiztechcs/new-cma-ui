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

if (process.platform === 'win32') {
  executablePath = getAssetPath('SDK', 'zebra-printer', 'ZplToPrinter.dll');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${executablePath}`;
}

const loadPrinterFunctions = () => {
  try {
    const myPrinterLibrary = koffi.load(executablePath);

    MyPrinter = {
      printZPLToUSBPrinter: myPrinterLibrary.func(
        'printZPLToUSBPrinter',
        'void',
        ['string', 'string'],
      ),
    };
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing Label Printer Library Functions',
      message: `Error loading Label Printer library :- ${error} && DLL file exists =>${fs.existsSync(executablePath) ? 'yes' : 'no'} `,
    });
  }
};

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

function filterDevicesByVIDPID(devices, name) {
  return devices.some((device) => device.Name === name);
}

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

        const isPrinterFound = filterDevicesByVIDPID(
          devices,
          'ZDesigner ZD421-203dpi ZPL',
        );

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
