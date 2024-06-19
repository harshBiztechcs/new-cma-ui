const path = require('path');
const { dialog } = require('electron');
const { spawn } = require('child_process');
const { SerialPort } = require('serialport');
const koffi = require('koffi');
const { getAssetPath } = require('../../util');

let dllDirectory = null;
let cDemoFilePath = null;
const calibrateFilePath = null;
let settingFilePath = null;
let informationFilePath = null;
let gratingspectrometer = null;
let manuallyMesurment = null;

const handleSize = 8; // Assuming 8 bytes for pointer size

// Allocate memory for the handle
const spectrometerHandle = Buffer.alloc(handleSize);

// const NH_SpectrometerHandle = ref.refType('void');
// const spectrometerHandle = ref.alloc(NH_SpectrometerHandle);

if (process.platform === 'win32') {
  dllDirectory = getAssetPath('SDK', 'CMA-ROP64E-UV', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDirectory}`;

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
  informationFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV',
    'Device_Information',
    'getDeviceInformation',
  );
}

// all sdk functions related to ci64UV needs to expose here first
const loadSpectrometerLibraryFunctions = () => {
  try {
    const dllPath = path.join(dllDirectory, 'GratingSpectrometerApi');
    const spectrometerLib = koffi.load(dllPath);

    spectrometerLib.NH_OpenDevice = koffi.func(
      'int NH_OpenDevice(void*, const char*)',
    );
    spectrometerLib.NH_CloseDevice = koffi.func('void NH_CloseDevice(void*)');
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing CMA-ROP64E-UV Library Functions',
      message: 'error loading CMA-ROP64E-UV library',
    });
  }
};

function terminateChildProcess(childProcess) {
  childProcess.kill(); // Terminate the child process
}

async function runCPlusPlusProgram(executablePath, args = []) {
  console.log('Run C-Demo Code...', executablePath);
  return new Promise((resolve, reject) => {
    const childProcess = spawn(executablePath, args);

    childProcess.stdout.on('data', (data) => {
      terminateChildProcess(childProcess);
      resolve(data.toString());
    });

    childProcess.stderr.on('data', (data) => {
      reject('failure.');
    });

    childProcess.on('exit', (code, signal) => {});

    childProcess.on('error', (error) => {
      reject(error);
    });

    process.stdin.resume();

    const handleTermination = () => {
      terminateChildProcess(childProcess);
      process.exit();
    };

    process.on('SIGINT', handleTermination);
    process.on('SIGTERM', handleTermination);
  });
}

function convertStringToObject(inputString) {
  const lines = inputString.trim().split('\n');
  const resultObject = {};

  lines.forEach((line) => {
    const [key, value] = line.split(':').map((item) => item.trim());
    resultObject[key] = isNaN(value) ? value : parseFloat(value) || value;
  });

  return resultObject;
}

async function trimObjectValues(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    } else if (Array.isArray(obj[key])) {
      obj[key] = obj[key].map((value) => value.trim());
    } else if (typeof obj[key] === 'object') {
      await trimObjectValues(obj[key]); // Use await for recursive call
    }
  }
}

async function closeSpectrometerDevice() {
  try {
    console.log('Spectrometer closed successfully.');
    await gratingspectrometer.NH_CloseDevice(spectrometerHandle);
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error };
  }
}

async function openSpectrometerDevice() {
  try {
    await closeSpectrometerDevice();
    const result = await gratingspectrometer.NH_OpenDevice(
      spectrometerHandle,
      null,
    );

    if (result === 0) {
      console.log('Spectrometer opened successfully.');
      return { res: true, error: null };
    }
    return { res: false, error: 'Failed to open spectrometer' };
  } catch (error) {
    return { res: false, error };
  }
}
async function checkCMAROP64EConnection() {
  try {
    const ports = await SerialPort.list();
    const connectedPort = ports.find(
      (port) => port.vendorId === '1782' && port.productId === '4D00',
    );

    return {
      res: !!connectedPort,
      errorMessage: null,
    };
  } catch (error) {
    return {
      res: false,
      errorMessage: `Error connecting to the CMA-ROP64E-UV: ${error}`,
    };
  }
}

async function getInformationDevice() {
  try {
    await closeSpectrometerDevice();
    const informationData = await runCPlusPlusProgram(informationFilePath);
    const parsedData = convertStringToObject(informationData);
    return { res: true, data: parsedData.SN, error: null };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Information retrieval error: ${error}`,
    };
  }
}

async function calibrateSpectrometerDevice() {
  return { res: true, error: null };
}

async function settingSpectrometerOptions(options) {
  try {
    await closeSpectrometerDevice();

    const args = [
      options['Colorimetric.Illumination'],
      'NH_Phi8',
      options.Specular,
      options['Colorimetric.Observer'],
      options.UV,
    ];
    const data = await runCPlusPlusProgram(settingFilePath, args);
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

async function measureDeviceAutomatic(settingsData) {
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

async function calculateAverages(dataArray) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    throw new Error('Input data array is either not an array or empty.');
  }

  const wavelengthRange = dataArray[0].SCI['Wavelength Range'];

  // Initialize variables to store sum of L*, a*, and b* values for SCI and SCE
  let sum_L_SCI = 0;
  let sum_a_SCI = 0;
  let sum_b_SCI = 0;
  let sum_L_SCE = 0;
  let sum_a_SCE = 0;
  let sum_b_SCE = 0;

  // Initialize arrays to store sum of data values for SCI and SCE
  const sumValues_SCI = Array(dataArray[0].SCI.data.length).fill(0);
  const sumValues_SCE = Array(dataArray[0].SCE.data.length).fill(0);

  // Iterate over dataArray to calculate sums
  dataArray.forEach((item) => {
    // SCI
    sum_L_SCI += parseFloat(item.SCI['L*']);
    sum_a_SCI += parseFloat(item.SCI['a*']);
    sum_b_SCI += parseFloat(item.SCI['b*']);

    // SCE
    sum_L_SCE += parseFloat(item.SCE['L*']);
    sum_a_SCE += parseFloat(item.SCE['a*']);
    sum_b_SCE += parseFloat(item.SCE['b*']);

    // SCI data
    item.SCI.data.forEach((value, index) => {
      sumValues_SCI[index] += parseFloat(value);
    });

    // SCE data
    item.SCE.data.forEach((value, index) => {
      sumValues_SCE[index] += parseFloat(value);
    });
  });

  // Calculate averages for L*, a*, and b* values
  const avg_L_SCI = (sum_L_SCI / dataArray.length).toFixed(2);
  const avg_a_SCI = (sum_a_SCI / dataArray.length).toFixed(2);
  const avg_b_SCI = (sum_b_SCI / dataArray.length).toFixed(2);

  const avg_L_SCE = (sum_L_SCE / dataArray.length).toFixed(2);
  const avg_a_SCE = (sum_a_SCE / dataArray.length).toFixed(2);
  const avg_b_SCE = (sum_b_SCE / dataArray.length).toFixed(2);

  // Calculate averages for data values
  const avgValues_SCI = sumValues_SCI.map((sum) =>
    (sum / dataArray.length).toFixed(2),
  );
  const avgValues_SCE = sumValues_SCE.map((sum) =>
    (sum / dataArray.length).toFixed(2),
  );

  // Output in the specified format
  const output = {
    res: true,
    data: {
      SCI: {
        'L*': avg_L_SCI,
        'a*': avg_a_SCI,
        'b*': avg_b_SCI,
        'Wavelength Range': wavelengthRange,
        Interval: '10nm',
        data: avgValues_SCI,
      },
      SCE: {
        'L*': avg_L_SCE,
        'a*': avg_a_SCE,
        'b*': avg_b_SCE,
        'Wavelength Range': wavelengthRange,
        Interval: '10nm',
        data: avgValues_SCE,
      },
    },
    error: null,
  };
  return output;
}

module.exports = {
  loadSpectrometerLibraryFunctions,
  openSpectrometerDevice,
  closeSpectrometerDevice,
  calibrateSpectrometerDevice,
  measureDeviceManually,
  measureDeviceAutomatic,
  settingSpectrometerOptions,
  getInformationDevice,
  checkCMAROP64EConnection,
  calculateAverages,
};
