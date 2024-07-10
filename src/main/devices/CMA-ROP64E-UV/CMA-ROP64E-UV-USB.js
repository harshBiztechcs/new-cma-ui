/* eslint-disable no-console */
/* eslint-disable consistent-return */
const fs = require('fs');
const koffi = require('koffi');
const path = require('path');
const { dialog } = require('electron');
const { spawn } = require('child_process');
const { getAssetPath } = require('../../util');
const { listSystemUSBDevices } = require('../../utility');

let dllDir = null;
let gratingSpectrometer = null;
let cDemoFilePath = null;
let settingFilePath = null;
let informationFilePath = null;
let manuallyMesurment = null;

if (process.platform === 'win32') {
  dllDir = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV',
    'x64',
    'GratingSpectrometer.dll',
  );
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;

  cDemoFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV',
    'Automatic_mesurment',
    'automaticMesurment',
  );
  settingFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV',
    'Measurement_parameter',
    'measurementParameterSettings',
  );
  manuallyMesurment = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV',
    'Manually_mesurment',
    'manuallyMesurment',
  );
}

// all sdk functions related to ci64UV needs to expose here first
const loadSpectrometerLibraryFunctions = () => {
  try {
    // Check if the DLL file exists
    // Load the DLL
    const spectrometerLibrary = koffi.load(dllDir);

    // Define the function signatures
    gratingSpectrometer = {
      open_connection: spectrometerLibrary.func('open_connection', 'bool', []),
      close_connection: spectrometerLibrary.func(
        'close_connection',
        'void',
        [],
      ),
      GetInstrumentInfo: spectrometerLibrary.func(
        'GetInstrumentInfo',
        'string',
        [],
        {
          stdcall: true,
        },
      ),
      scan_ble_devices: spectrometerLibrary.func(
        'scan_ble_devices',
        'string',
        [],
        {
          stdcall: true,
        },
      ),
      connectByBle: spectrometerLibrary.func(
        'connectByBle',
        'bool',
        ['string'],
        {
          stdcall: true,
        },
      ),
      measureWithUSB: spectrometerLibrary.func(
        'measureWithUSB',
        'string',
        ['string', 'string', 'string', 'string'],
        { stdcall: true },
      ),
      measurementParameterWithUSB: spectrometerLibrary.func(
        'measurementParameterWithUSB',
        'string',
        ['string', 'string', 'string', 'string'],
        { stdcall: true },
      ),
      GetInstrumentInfoBT: spectrometerLibrary.func(
        'GetInstrumentInfoBT',
        'string',
        ['string'],
        { stdcall: true },
      ),
    };
  } catch (error) {
    console.error('Error loading ROP64 USB library:', error);
    dialog.showMessageBox(null, {
      title: 'Exposing ROP64 USB Library Functions',
      message: `Error loading ROP64 USB library :- ${error.message} && DLL file exists =>${fs.existsSync(dllDir) ? 'yes' : 'no'} `,
    });
    return null; // Return null in case of an error
  }
};

async function closeSpectrometerDevice() {
  try {
    await gratingSpectrometer.close_connection();
    return { res: true, error: null };
  } catch (error) {
    return {
      res: false,
      error: `Error closing spectrometer: ${error.message}`,
    };
  }
}

async function openSpectrometerDevice() {
  try {
    await closeSpectrometerDevice();
    const result = await gratingSpectrometer.open_connection();

    if (result) {
      return { res: true, error: null };
    }
    return { res: false, error: 'Failed to open spectrometer' };
  } catch (error) {
    return {
      res: false,
      error: `Error opening spectrometer: ${error.message}`,
    };
  }
}

async function checkCMAROP64EConnection() {
  try {
    const output = await listSystemUSBDevices();

    // Search for the specific devices in the output
    const isConnected = output.includes('1782') && output.includes('4D00');

    return {
      res: isConnected,
      errorMessage: null,
    };
  } catch (error) {
    return {
      res: false,
      errorMessage: `Error connecting to the device: ${error}`,
    };
  }
}

async function getDeviceInfoFromUSBPort() {
  try {
    await closeSpectrometerDevice();
    const serialNumber = await gratingSpectrometer.GetInstrumentInfo();

    if (
      typeof serialNumber === 'string' &&
      serialNumber.trim() !== '' &&
      !serialNumber.includes("Can't parse data")
    ) {
      return { res: true, data: serialNumber, error: null };
    }
    return {
      res: false,
      data: null,
      error: 'Failed to retrieve device information',
    };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Error retrieving device information: ${error.message}`,
    };
  }
}

async function setSpectrometerOptionsViaUSB(options) {
  try {
    await closeSpectrometerDevice();
    const isSettingsApplied =
      await gratingSpectrometer.measurementParameterWithUSB(
        options['Colorimetric.Observer'],
        options['Colorimetric.Illumination'],
        options.Specular,
        `${options.UV}`,
      );
    if (isSettingsApplied) {
      return { res: true, data: null, error: null };
    }
    return {
      res: false,
      data: null,
      error: 'Failed to apply spectrometer settings',
    };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Error applying spectrometer settings: ${error.message}`,
    };
  }
}

async function calibrateSpectrometerDevice() {
  return { res: true, error: null };
}

async function performAutomaticMeasurement(options) {
  try {
    await loadSpectrometerLibraryFunctions();
    await closeSpectrometerDevice();
    const measurementResult = await gratingSpectrometer.measureWithUSB(
      options['Colorimetric.Observer'],
      options['Colorimetric.Illumination'],
      options.Specular,
      `${options.UV}`,
    );
    console.log('measurementResult', measurementResult);
    if (!measurementResult) {
      throw new Error('No measurement result received');
    }
    const data = JSON.parse(measurementResult);
    return { res: true, data, error: null };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Measurement error: ${error.message}`,
    };
  }
}

async function measureDeviceManually() {}

async function calculateAverages() {}

module.exports = {
  loadSpectrometerLibraryFunctions,
  openSpectrometerDevice,
  closeSpectrometerDevice,
  checkCMAROP64EConnection,
  calibrateSpectrometerDevice,
  measureDeviceManually,
  performAutomaticMeasurement,
  setSpectrometerOptionsViaUSB,
  getDeviceInfoFromUSBPort,
  calculateAverages,
};
