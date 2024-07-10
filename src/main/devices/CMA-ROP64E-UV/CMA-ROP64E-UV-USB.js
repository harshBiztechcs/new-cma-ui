/* eslint-disable consistent-return */
/* eslint-disable no-console */
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

function terminateChildProcess(childProcess) {
  if (!childProcess.killed) {
    childProcess.kill('SIGINT');
    childProcess.kill('SIGTERM');
  }
}

async function runCPlusPlusProgram(executablePath, args = []) {
  console.log(
    `Running C++ program at ${executablePath} with args ${args.join(' ')}`,
  );

  return new Promise((resolve, reject) => {
    const childProcess = spawn(executablePath, args);

    childProcess.stdout.on('data', (data) => {
      terminateChildProcess(childProcess);
      resolve(data.toString().trim()); // trim to remove trailing newline
    });

    childProcess.stderr.on('data', (errorData) => {
      reject(new Error(`${errorData.toString().trim()}`));
    });

    childProcess.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`${code}`));
      }
    });

    childProcess.on('error', (error) => {
      reject(new Error(`${error.message}`));
    });

    process.stdin.resume();

    const handleTermination = () => {
      terminateChildProcess(childProcess);
      process.exit(1); // exit with non-zero code to indicate error
    };

    process.on('SIGINT', handleTermination);
    process.on('SIGTERM', handleTermination);
  });
}

function trimObjectValues(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = value.trim();
      } else if (Array.isArray(value)) {
        acc[key] = value.map((item) =>
          typeof item === 'string' ? item.trim() : trimObjectValues(item),
        );
      } else if (typeof value === 'object') {
        acc[key] = trimObjectValues(value);
      } else {
        acc[key] = value;
      }
      return acc;
    },
    Array.isArray(obj) ? [] : {},
  );
}

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

async function calibrateSpectrometerDevice() {
  return { res: true, error: null };
}

async function setSpectrometerOptionsViaUSB(options) {
  try {
    await closeSpectrometerDevice();

    const args = [
      options['Colorimetric.Illumination'],
      'NH_Phi8',
      options.Specular,
      options['Colorimetric.Observer'],
      options.UV,
    ];
    await runCPlusPlusProgram(settingFilePath, args);
    console.log('Setting Device successfully');
    return { res: true, data: null, error: null };
  } catch (error) {
    console.error('Setting error:', error);
    return {
      res: false,
      data: null,
      error: `Please disconnect and reconnect your device`,
    };
  }
}

async function measureDeviceManually(settingsData) {
  try {
    await closeSpectrometerDevice();
    const args = [
      settingsData['Colorimetric.Observer'],
      settingsData['Colorimetric.Illumination'],
    ];
    const measurementData = await runCPlusPlusProgram(manuallyMesurment, args);

    if (measurementData) {
      const parsedMeasurementData = JSON.parse(measurementData);
      await trimObjectValues(parsedMeasurementData);
      console.log('Manually Measurement Device Data retrieved successfully');
      return { res: true, data: parsedMeasurementData, error: null };
    }

    return {
      res: false,
      data: null,
      error: `Please disconnect and reconnect your device`,
    };
  } catch (error) {
    console.error('Measurement error:', error);
    return {
      res: false,
      data: null,
      error: `Please disconnect and reconnect your device`,
    };
  }
}

async function performAutomaticMeasurement(settingsData) {
  try {
    await closeSpectrometerDevice();
    const args = [
      settingsData['Colorimetric.Observer'],
      settingsData['Colorimetric.Illumination'],
      settingsData.Specular,
      settingsData.UV,
    ];
    const measurementData = await runCPlusPlusProgram(cDemoFilePath, args);

    if (measurementData) {
      const parsedMeasurementData = JSON.parse(measurementData);
      await trimObjectValues(parsedMeasurementData);
      console.log('Automatic Measurement Device Data retrieved successfully');
      return { res: true, data: parsedMeasurementData, error: null };
    }

    return {
      res: false,
      data: null,
      error: `Please disconnect and reconnect your device`,
    };
  } catch (error) {
    console.error('Measurement error:', error);
    return {
      res: false,
      data: null,
      error: `Please disconnect and reconnect your device`,
    };
  }
}

function calculateAverages(measurements) {
  if (!Array.isArray(measurements) || measurements.length === 0) {
    throw new Error(
      'Input measurements array is either not an array or empty.',
    );
  }

  const wavelengthRange = measurements[0].SCI['Wavelength Range'];
  const dataLength = measurements[0].SCI.data.length;

  const initialSums = {
    SCI: { L: 0, a: 0, b: 0, data: new Array(dataLength).fill(0) },
    SCE: { L: 0, a: 0, b: 0, data: new Array(dataLength).fill(0) },
  };

  const sums = measurements.reduce((acc, measurement) => {
    ['SCI', 'SCE'].forEach((mode) => {
      acc[mode].L += parseFloat(measurement[mode]['L*']);
      acc[mode].a += parseFloat(measurement[mode]['a*']);
      acc[mode].b += parseFloat(measurement[mode]['b*']);

      measurement[mode].data.forEach((value, index) => {
        acc[mode].data[index] += parseFloat(value);
      });
    });
    return acc;
  }, initialSums);

  const count = measurements.length;
  const averages = {};

  ['SCI', 'SCE'].forEach((mode) => {
    averages[mode] = {
      'L*': (sums[mode].L / count).toFixed(2),
      'a*': (sums[mode].a / count).toFixed(2),
      'b*': (sums[mode].b / count).toFixed(2),
      'Wavelength Range': wavelengthRange,
      Interval: '10nm',
      data: sums[mode].data.map((sum) => (sum / count).toFixed(2)),
    };
  });

  return {
    res: true,
    data: averages,
    error: null,
  };
}

module.exports = {
  loadSpectrometerLibraryFunctions,
  openSpectrometerDevice,
  closeSpectrometerDevice,
  calibrateSpectrometerDevice,
  measureDeviceManually,
  performAutomaticMeasurement,
  setSpectrometerOptionsViaUSB,
  getDeviceInfoFromUSBPort,
  checkCMAROP64EConnection,
  calculateAverages,
};
