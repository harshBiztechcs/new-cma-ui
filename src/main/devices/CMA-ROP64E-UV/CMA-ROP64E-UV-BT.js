const path = require('path');
const { dialog } = require('electron');
const { spawn } = require('child_process');
const { SerialPort } = require('serialport');
const ReadlineParser = require('@serialport/parser-readline');
const { getAssetPath } = require('../../util');
const { closeSpectrometerDevice } = require('./CMA-ROP64E-UV-USB');

let autoMeasurementFilePath = null;
let measurementParamsFilePath = null;
let manualMeasurementFilePath = null;
let scanDEviceFilePath = null;
let informationFilePath = null;
let deviceSerialNumber = null;

if (process.platform === 'win32') {
  autoMeasurementFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Automatic_measurement',
    'automaticMeasurement',
  );
  measurementParamsFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Measurement_parameter',
    'measurementParameterSettings',
  );
  manualMeasurementFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Manual_measurement',
    'manualMeasurement',
  );
  scanDEviceFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Scan_Device',
    'scanDevice',
  );
  informationFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Device_Information',
    'getDeviceInformation',
  );
}

async function findConnectedPort() {
  try {
    const ports = await SerialPort.list();
    const connectedPort = ports.find(
      (port) => port.vendorId === '1A86' && port.productId === '7523',
    );
    if (connectedPort) {
      return {
        res: true,
        data: connectedPort,
        error: null,
      };
    }
    return {
      res: false,
      data: null,
      error: 'No connected port found.',
    };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Error finding connected port: ${error}`,
    };
  }
}

async function checkBluetoothConnection() {
  try {
    // await closeSpectrometerDevice();
    const { res, data, error } = await findConnectedPort();
    return { res, data, error };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Error checking connection: ${error}`,
    };
  }
}

function terminateChildProcess(childProcess) {
  childProcess.kill(); // Terminate the child process
}

async function executeCPlusPlusProgram(executablePath, args = []) {
  console.log('Executing C++ Program...', executablePath);
  return new Promise((resolve, reject) => {
    const childProcess = spawn(executablePath, args);

    childProcess.stdout.on('data', (data) => {
      terminateChildProcess(childProcess);
      resolve(data.toString());
    });

    childProcess.stderr.on('data', (data) => {
      reject('execution failed.');
    });

    childProcess.on('error', (error) => {
      reject(error);
    });

    process.on('SIGINT', () => {
      terminateChildProcess(childProcess);
      process.exit();
    });
  });
}

function parseDataStringToObject(inputString) {
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

async function setSpectrometerOptions(options, macAddress) {
  const maxAttempts = 10;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const response = await trySettingSpectrometerOptions(options, macAddress);
      if (response.res) {
        console.log('Device settings applied successfully');
        return response;
      }
    } catch (error) {
      console.log(
        '🚀 ~ file: CMA-ROP64E-UV-BT.js:148 ~ setSpectrometerOptions ~ error:',
        error,
      );
      return {
        res: false,
        data: null,
        error: 'Please unplug the USB and plug it again',
      };
    }
    attempt++;
  }

  if (attempt === maxAttempts) {
    return {
      res: false,
      data: null,
      error: 'Please unplug the USB and plug it again',
    };
  }
}

async function trySettingSpectrometerOptions(options, macAddress) {
  try {
    await closeSpectrometerDevice();
    const args = [
      options['Colorimetric.Illumination'],
      'NH_Phi8',
      options.Specular,
      options['Colorimetric.Observer'],
      options.UV,
      macAddress,
    ];
    console.log('🚀 ~ setSpectrometerOptions ~ args:', args);

    const data = await executeCPlusPlusProgram(measurementParamsFilePath, args);
    if (data) {
      return { res: true, data: null, error: null };
    }
    return {
      res: false,
      data: null,
      error: `Failed to set device options: ${error}`,
    };
  } catch (error) {
    console.error('Error setting device options:', error);
    return {
      res: false,
      data: null,
      error: `Failed to set device options: ${error}`,
    };
  }
}

async function measureDeviceManuallyWithBT(settingsData, macAddress) {
  await closeSpectrometerDevice();
  try {
    const args = [
      settingsData['Colorimetric.Observer'],
      settingsData['Colorimetric.Illumination'],
      macAddress,
    ];
    const measurementData = await executeCPlusPlusProgram(
      manualMeasurementFilePath,
      args,
    );

    if (measurementData) {
      const parsedMeasurementData = JSON.parse(measurementData);
      await trimObjectValues(parsedMeasurementData);
      console.log('Manual measurement data retrieved successfully');
      return { res: true, data: parsedMeasurementData, error: null };
    }

    return {
      res: false,
      data: null,
      error:
        'Failed to retrieve measurement data. Please unplug the USB and plug it again',
    };
  } catch (error) {
    console.error('Error during manual measurement:', error);
    return {
      res: false,
      data: null,
      error: `Failed to measure manually: ${error}`,
    };
  }
}

async function tryMeasureDeviceAutomaticallyWithBluetooth(
  measurementParams,
  deviceMAC,
) {
  try {
    await closeSpectrometerDevice();
    const args = [
      measurementParams['Colorimetric.Observer'],
      measurementParams['Colorimetric.Illumination'],
      deviceMAC,
    ];

    console.log('Arguments for automatic measurement:', args);

    const measurementData = await executeCPlusPlusProgram(
      autoMeasurementFilePath,
      args,
    );

    if (measurementData) {
      const parsedMeasurementData = JSON.parse(measurementData);
      await trimObjectValues(parsedMeasurementData);

      return { res: true, data: parsedMeasurementData, error: null };
    }

    return {
      res: false,
      data: null,
      error: 'Failed to retrieve measurement data',
    };
  } catch (error) {
    console.error('Error during automatic measurement:', error);
    return {
      res: false,
      data: null,
      error: `Failed to measure automatically: ${error}`,
    };
  }
}

async function measureDeviceAutomaticWithBT(options, deviceMAC) {
  const maxAttempts = 10;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const measurementResult =
        await tryMeasureDeviceAutomaticallyWithBluetooth(options, deviceMAC);

      if (measurementResult.res) {
        console.log('Automatic measurement data retrieved resfully');
        return measurementResult;
      }
    } catch (error) {
      console.error('Error during automatic measurement:', error);
      return {
        res: false,
        data: null,
        error:
          'Failed to measure automatically. Please unplug the USB and plug it again',
      };
    }
    attempt++;
  }

  return {
    res: false,
    data: null,
    error: 'Please unplug the USB and plug it again',
  };
}

function convertData(data) {
  // Split data by newline character
  const lines = data.split('\n');

  // Initialize an empty array to store the converted data
  const convertedData = [];

  // Loop through each line of the data
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Split each line by comma
    const parts = line.split(', ');

    // Check if the line has three parts
    if (parts.length === 3) {
      // Extract individual parts
      const name = parts[0];
      const address = parts[1];
      const signalIntensity = parseInt(parts[2]);

      // Create an object with the extracted parts and push it to the convertedData array
      convertedData.push({
        Index: i,
        Name: name,
        Address: address,
        SignalIntensity: signalIntensity,
      });
    }
  }

  return convertedData;
}

async function tryGetScannedDeviceList() {
  await closeSpectrometerDevice();

  try {
    const scannedDeviceListArr =
      await executeCPlusPlusProgram(scanDEviceFilePath);

    if (scannedDeviceListArr) {
      const scannedDeviceList = convertData(scannedDeviceListArr);
      console.log('Scanning YS3060 device!!!...');
      return { res: true, data: scannedDeviceList, error: null };
    }

    return { res: false, data: null, error: 'Failed to scan device' };
  } catch (error) {
    console.error('Error during device scan:', error);
    return { res: false, data: null, error: `Failed to scan device: ${error}` };
  }
}

async function getScannedDeviceList() {
  const maxAttempts = 10;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const deviceListData = await tryGetScannedDeviceList();

      if (deviceListData.res) {
        return deviceListData;
      }
    } catch (error) {
      return {
        res: false,
        data: null,
        error: 'Failed to scan device. Please unplug the USB and plug it again',
      };
    }
    attempt++;
  }

  return {
    res: false,
    data: null,
    error: 'Please unplug the USB and plug it again',
  };
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

async function fetchDataFromDevice() {
  try {
    await closeSpectrometerDevice();
    const informationData = await executeCPlusPlusProgram(informationFilePath);
    const parsedData = convertStringToObject(informationData);
    deviceSerialNumber = parsedData.SN;
    return {
      res: true,
      data: { serialNumber: parsedData.SN },
      error: null,
    };
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Error retrieving information: ${error}`,
    };
  }
}

async function getInformationDeviceWithBT() {
  if (!deviceSerialNumber) {
    return await fetchDataFromDeviceWithRetry();
  }
  return {
    res: true,
    data: { serialNumber: deviceSerialNumber },
    error: null,
  };
}

async function fetchDataFromDeviceWithRetry() {
  const maxAttempts = 10;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const informationData = await fetchDataFromDevice();

      if (informationData.res) {
        return informationData;
      }
    } catch (error) {
      return {
        res: false,
        data: null,
        error:
          'Failed to fetch information from the device. Please unplug the USB and plug it again',
      };
    }
    attempt++;
  }

  return {
    res: false,
    data: null,
    error: 'Please unplug the USB and plug it again',
  };
}

module.exports = {
  checkBluetoothConnection,
  measureDeviceAutomaticWithBT,
  measureDeviceManuallyWithBT,
  setSpectrometerOptions,
  getScannedDeviceList,
  getInformationDeviceWithBT,
};
