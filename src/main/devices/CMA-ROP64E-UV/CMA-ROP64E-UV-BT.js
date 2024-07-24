const ffi = require('@lwahonen/ffi-napi');
const ref = require('@lwahonen/ref-napi');
const path = require('path');
const { dialog } = require('electron');
const { getAssetPath } = require('../../util');
const { spawn } = require('child_process');
const { listSystemUSBDevices } = require('../../utility');
const ReadlineParser = require('@serialport/parser-readline');
const { closeSpectrometerDevice } = require('./CMA-ROP64E-UV-USB');

let autoMeasurementFilePath = null;
let measurementParamsFilePath = null;
let manualMeasurementFilePath = null;
let scanDeviceFilePath = null;
let informationFilePath = null;
let deviceSerialNumber = null;

if (process.platform === 'win32') {
  autoMeasurementFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Automatic_measurement',
    'Automatic_measurement'
  );
  measurementParamsFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Measurement_parameter',
    'Measurement_parameter'
  );
  manualMeasurementFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Manual_measurement',
    'manualMeasurement'
  );
  scanDeviceFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Scan_Device',
    'Scan_Device'
  );
  informationFilePath = getAssetPath(
    'SDK',
    'CMA-ROP64E-UV-BT',
    'Device_Information',
    'Device_Information'
  );
}

async function checkBluetoothConnection() {
  try {
    const output = await listSystemUSBDevices();

    // Search for the specific devices in the output
    const isConnected = output.includes('7523') && output.includes('1A86');

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
      reject(data.toString());
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
        error
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
      args
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
  deviceMAC
) {
  try {
    await closeSpectrometerDevice();
    const args = [
      measurementParams['Colorimetric.Observer'],
      measurementParams['Colorimetric.Illumination'],
      measurementParams.Specular,
      measurementParams.UV,
    ];

    console.log('Arguments for automatic measurement:', args);

    const measurementData = await executeCPlusPlusProgram(
      autoMeasurementFilePath,
      args
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

async function tryGetScannedDeviceList() {
  await closeSpectrometerDevice();
  try {
    const scannedDeviceListResponse = await executeCPlusPlusProgram(
      scanDeviceFilePath
    );

    if (scannedDeviceListResponse) {
      const parsedDeviceList = JSON.parse(scannedDeviceListResponse);

      if (
        parsedDeviceList &&
        parsedDeviceList.name !== undefined &&
        parsedDeviceList.address !== undefined
      ) {
        console.log('Scanning YS3060 device!!!...');
        return {
          res: true,
          data: [
            { name: parsedDeviceList.name, address: parsedDeviceList.address },
          ],
          error: null,
        };
      }

      return {
        res: false,
        data: null,
        error: 'Failed to scan device',
      };
    }

    return {
      res: false,
      data: null,
      error: 'Failed to retrieve scanned device list',
    };
  } catch (error) {
    console.error('Error during device scan:', error);
    return {
      res: false,
      data: null,
      error: `Failed to scan device: ${error}`,
    };
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

async function fetchDataFromDevice() {
  try {
    await closeSpectrometerDevice();
    const deviceInfoData = await executeCPlusPlusProgram(informationFilePath);
    if (deviceInfoData) {
      const deviceInfoObject = JSON.parse(deviceInfoData);
      const serialNumber = deviceInfoObject.serialNumber;
      deviceSerialNumber = serialNumber;
      return {
        res: true,
        data: { serialNumber },
        error: null,
      };
    }
  } catch (error) {
    return {
      res: false,
      data: null,
      error: `Error retrieving device information: ${error}`,
    };
  }
}

async function getInformationDeviceWithBT() {
  if (!deviceSerialNumber) {
    return await fetchDataFromDeviceWithRetry();
  } else {
    return {
      res: true,
      data: { serialNumber: deviceSerialNumber },
      error: null,
    };
  }
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
