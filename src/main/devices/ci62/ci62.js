/* eslint-disable no-console */
/* eslint-disable consistent-return */
const fs = require('fs');
const koffi = require('koffi');
const path = require('path');
const { dialog } = require('electron');
const { getAssetPath } = require('../../util');

let dllDir = null;
let ci62 = null;
let specularType = null;
let measureInterval = null;
let startMeasure = false;
const illuobsType = {
  'A/2': 0,
  'A/10': 1,
  'C/2': 2,
  'C/10': 3,
  'D50/2': 4,
  'D50/10': 5,
  'D65/2': 8,
  'D65/10': 9,
  'F2/2': 12,
  'F2/10': 13,
  'F7/2': 14,
  'F7/10': 15,
  'F11/2': 20,
  'F11/10': 21,
  'F12/2': 22,
  'F12/10': 23,
};

if (process.platform === 'win32') {
  dllDir = getAssetPath('SDK', 'Ci62', 'x64', 'Ci62.dll');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci62 needs to expose here first
const loadCi62LibraryFunctions = () => {
  try {
    // Check if the DLL file exists
    // Load the DLL
    const ci62Library = koffi.load(dllDir);

    // Define the function signatures
    ci62 = {
      GetInterfaceVersion: ci62Library.func('GetInterfaceVersion', 'str', []),
      Connect: ci62Library.func('Connect', 'bool', []),
      Disconnect: ci62Library.func('Disconnect', 'bool', []),
      IsConnected: ci62Library.func('IsConnected', 'bool', []),
      GetCalibrationStandard: ci62Library.func(
        'GetCalibrationStandard',
        'str',
        [],
      ),
      GetSerialNum: ci62Library.func('GetSerialNum', 'str', []),
      GetSpectralSetCount: ci62Library.func('GetSpectralSetCount', 'int', []),
      GetSpectralSetName: ci62Library.func('GetSpectralSetName', 'str', [
        'int',
      ]),
      GetWavelengthCount: ci62Library.func('GetWavelengthCount', 'int', []),
      GetWavelengthValue: ci62Library.func('GetWavelengthValue', 'int', [
        'int',
      ]),
      Measure: ci62Library.func('Measure', 'bool', []),
      IsDataReady: ci62Library.func('IsDataReady', 'bool', []),
      GetSpectralData: ci62Library.func('GetSpectralData', 'float', [
        'int',
        'int',
      ]),
      GetCalStatus: ci62Library.func('GetCalStatus', 'int', []),
      GetCalSteps: ci62Library.func('GetCalSteps', 'str', []),
      CalibrateStep: ci62Library.func('CalibrateStep', 'bool', ['str']),
      GetCalMode: ci62Library.func('GetCalMode', 'str', []),
      GetCalProgress: ci62Library.func('GetCalProgress', 'int', []),
      AbortCalibration: ci62Library.func('AbortCalibration', 'bool', []),
      ClearSamples: ci62Library.func('ClearSamples', 'bool', []),
      GetSampleCount: ci62Library.func('GetSampleCount', 'int', []),
      GetSampleData: ci62Library.func('GetSampleData', 'float', ['int', 'int']),
      SetCurrentSample: ci62Library.func('SetCurrentSample', 'bool', ['int']),
      GetAvailableSettings: ci62Library.func('GetAvailableSettings', 'str', []),
      GetSettingOptions: ci62Library.func('GetSettingOptions', 'str', ['str']),
      GetOption: ci62Library.func('GetOption', 'str', ['str']),
      SetOption: ci62Library.func('SetOption', 'bool', ['str', 'str']),
      ScanIsSupported: ci62Library.func('ScanIsSupported', 'bool', []),
      GetLastErrorCode: ci62Library.func('GetLastErrorCode', 'int', []),
      GetLastErrorString: ci62Library.func('GetLastErrorString', 'str', []),
      Execute: ci62Library.func('Execute', 'str', ['str']),
    };
  } catch (error) {
    console.error('Error loading ci62 library:', error);
    dialog.showMessageBox(null, {
      title: 'Exposing Ci62 Library Functions',
      message: `Error loading Ci62 library :- ${error.message} && DLL file exists =>${fs.existsSync(dllDir) ? 'yes' : 'no'} `,
    });
    return null; // Return null in case of an error
  }
};

const connect = () => ci62.Connect();
const disconnect = () => ci62.Disconnect();
const setParam = (option, value) =>
  ci62.Execute(`PARAM SET ${option} ${value}`);

// get serial number of ci62 device
const getCi62SerialNumber = () => {
  try {
    return ci62.GetSerialNum();
  } catch (error) {
    return null;
  }
};

// get last error info
const getLastError = () => {
  const errorCode = ci62.GetLastErrorCode();
  const errorString = ci62.GetLastErrorString();
  return { errorCode, errorString };
};

// performs connection to ci62 device
const connectCi62Device = () => {
  try {
    // connection
    if (ci62.IsConnected()) return { res: true, error: null };
    const isConnect = connect();
    if (!isConnect) {
      const error = getLastError();
      return { res: false, error: error.errorString };
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const disconnectCi62Device = () => {
  try {
    if (!ci62.IsConnected()) return { res: true, error: null };
    const isDisconnected = disconnect();
    if (!isDisconnected) {
      const error = getLastError();
      return { res: false, error: error.errorString };
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const createCi62ConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const obsrever = options['Colorimetric.Observer'] === 'TwoDegree' ? 2 : 10;
  configObj.Specular = options.Specular;
  configObj.MeasAverageNum = options.MeasAverageNum;
  configObj.IllumObs = illuobsType[`${illumination}/${obsrever}`];
  return configObj;
};

// set ci62 device configuration settings
const setCi62DeviceConfiguration = (obj) => {
  const options = createCi62ConfigurationSettings(obj);

  try {
    Object.entries(options).forEach(([key, value]) => {
      if (key === 'Specular') {
        specularType = value ?? null;
        return;
      }
      const setResult = setParam(key, value);
      if (setResult !== '<00>') {
        throw new Error(`Error setting ${key} - ${value}`);
      }
    });
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// common helper function to wait for calibration to complete,
// passed callback function will be called after calibration done
const waitForCi62CalibrationComplete = (callback) => {
  const getCalibrationStatus = () => ci62.Execute('CALSTATUS GET');

  let calProgress = getCalibrationStatus();

  const interval = setInterval(() => {
    calProgress = getCalibrationStatus();
    if (calProgress.includes('OK')) {
      clearInterval(interval);
      callback();
    }
  }, 500);
};

// get ci62 white calibration result
const getCi62WhiteCalibrationResult = () => {
  try {
    const spinWhiteCalibrationValue = ci62.Execute('CALPLAQUE GET SPIN');
    const spexWhiteCalValue = ci62.Execute('CALPLAQUE GET SPEX');
    return {
      res: true,
      calData: { spinWhiteCalibrationValue, spexWhiteCalValue },
    };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// manually perform measurement
const performMeasurement = () => {
  try {
    const res = ci62.Measure();
    if (!res) {
      return { res: false, error: getLastError() };
    }
    return { res: true };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const isDataReady = () => ci62.IsDataReady();

// change status of startMeasure
const updateCI62StartMeasure = (value) => {
  startMeasure = value;
};

const getCI62MeasureStatus = () => {
  return startMeasure;
};

// wait for measurement to complete
const waitForCi62MeasurementComplete = (callback) => {
  try {
    // flush last data ready status
    ci62.GetSpectralData(0, 0);

    startMeasure = true;
    let isReady = isDataReady();
    clearInterval(measureInterval);
    measureInterval = setInterval(() => {
      // check if startMeasure is still true or clear interval
      if (!startMeasure) {
        clearInterval(measureInterval);
        const resMsg = {
          res: false,
          error: 'Measurement Failed : Device Disconnected !!',
        };
        callback(resMsg);
        return;
      }

      isReady = isDataReady();
      if (isReady) {
        startMeasure = false;
        clearInterval(measureInterval);
        const resMsg = {
          res: true,
          error: null,
        };
        callback(resMsg);
      }
    }, 300);
  } catch (error) {
    startMeasure = false;
    clearInterval(measureInterval);
    const resMsg = {
      res: false,
      error: 'Measurement Failed',
    };
    callback(resMsg);
  }
};

const convertFloatValues = (data) => data?.map(parseFloat);

// get reflective and LAB data of last measurement

const getSpinData = () => {
  const refSpinData = ci62.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
  const labSpinData = ci62.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
  return {
    reflectanceData: convertFloatValues(refSpinData),
    LABData: convertFloatValues(labSpinData),
  };
};

const getSpexData = () => {
  const refSpexData = ci62.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
  const labSpexData = ci62.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
  return {
    reflectanceData: convertFloatValues(refSpexData),
    LABData: convertFloatValues(labSpexData),
  };
};

const getSpinAndSpexData = () => {
  const refSpinData = ci62.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
  const labSpinData = ci62.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
  const refSpexData = ci62.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
  const labSpexData = ci62.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
  return {
    SPINREFData: convertFloatValues(refSpinData),
    SPINLABData: convertFloatValues(labSpinData),
    SPEXREFData: convertFloatValues(refSpexData),
    SPEXLABData: convertFloatValues(labSpexData),
  };
};

const getCi62MeasurementData = () => {
  let data = {};

  try {
    if (specularType === 'SPIN') {
      data = getSpinData();
    } else if (specularType === 'SPEX') {
      data = getSpexData();
    } else if (specularType === 'SPIN_SPEX') {
      data = getSpinAndSpexData();
    }
    // Reset dataReady status to fail for next measurement wait
    ci62.GetSpectralData(0, 0);
    specularType = null;
    return { res: true, ...data };
  } catch (error) {
    specularType = null;
    return { res: false, error: error?.message };
  }
};

const getCalibrationExpireTime = () => {
  const calStatus = ci62.Execute('CALSTATUS GET');
  if (calStatus.includes('OK')) {
    try {
      const expireIn = calStatus.split(' ')[2];
      return Number.parseInt(expireIn, 10) * 60; // Use Number.parseInt
    } catch (error) {
      return 0;
    }
  }
  return 0;
};

const getTimeSinceLastCalibration = () => {
  try {
    const timeout = Number.parseInt(
      ci62.Execute('PARAM GET CalWhiteTimeout'),
      10,
    );
    if (timeout) {
      return timeout * 3600 - getCalibrationExpireTime();
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

const checkCi62Calibration = () => {
  try {
    const calStatus = ci62.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const getBasicCi62DeviceInfo = () => {
  try {
    const [serialNumber, interfaceVersion, timeSinceLastCal] = [
      ci62.GetSerialNum(),
      ci62.GetInterfaceVersion(),
      getTimeSinceLastCalibration(),
    ];

    const calStatus = checkCi62Calibration();
    const calExpireIn = calStatus ? getCalibrationExpireTime() : 0;

    return {
      SerialNumber: serialNumber,
      SDKVersion: null,
      SDKVersionRevision: null,
      TimeSinceLastCalibration: timeSinceLastCal,
      InterfaceVersion: interfaceVersion,
      hasCalibrated: calStatus,
      CalExpireIn: calExpireIn,
    };
  } catch (error) {
    return null;
  }
};

// common helper function for delay
const execQuery = (query) => {
  return ci62.Execute(query);
};

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const getSampleData = (index) => {
  const sampleData = {};
  try {
    sampleData.reflectanceData = {
      refSpinData: convertFloatValues(
        ci62.Execute(`SAMPLE GET REFL ${index} SPIN`).split(' '),
      ),
      refSpexData: convertFloatValues(
        ci62.Execute(`SAMPLE GET REFL ${index} SPEX`).split(' '),
      ),
    };
    sampleData.LABData = {
      labSpinData: convertFloatValues(
        ci62.Execute(`SAMPLE GET LAB ${index} SPIN`).split(' '),
      ),
      labSpexData: convertFloatValues(
        ci62.Execute(`SAMPLE GET LAB ${index} SPEX`).split(' '),
      ),
    };
    if (
      sampleData.reflectanceData.refSpinData.length === 31 &&
      sampleData.reflectanceData.refSpexData.length === 31 &&
      sampleData.LABData.labSpinData.length === 3 &&
      sampleData.LABData.labSpexData.length === 3
    ) {
      return sampleData;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getTransformName = (index) => {
  if (index === 7) {
    return 'None';
  }
  if (index === 8) {
    return execQuery('TRANSFORM GET NAME');
  }
  const allTransform = execQuery('TRANSFORM GET NAMES').split(' ');
  if (allTransform.length === index) {
    return allTransform[index];
  }
  return '';
};

const getSampleInfo = (options, index, geometry) => {
  const sampleInfo = {};
  try {
    options.forEach((key) => {
      if (key === 'NETPROFILERSTATUS') {
        sampleInfo[key] = ci62.GetOption('NetProfiler');
      } else if (key === 'TRANSFORMID') {
        sampleInfo[key] = getTransformName(
          execQuery(`SAMPLE GET ${key} ${index} ${geometry}`),
        );
      } else if (key === 'NAME') {
        sampleInfo[key] = '';
      } else if (key === 'JOBID') {
        sampleInfo[key] = '';
      } else {
        sampleInfo[key] = execQuery(`SAMPLE GET ${key} ${index} ${geometry}`);
      }
    });
    return sampleInfo;
  } catch (error) {
    return null;
  }
};

const getHeader = () => {
  return [
    'Name',
    'TimeStamp',
    'Aperture',
    'NetProfiler Status',
    'Transform',
    'Trigger Mode',
    'Project ID',
    'Job ID',
    'Standard',
    ...Array.from({ length: 31 }, (_, index) => `${index + 400} nm (SPIN)`),
    ...Array.from({ length: 31 }, (_, index) => `${index + 400} nm (SPEX)`),
    'L value (SPIN)LAB',
    'A value (SPIN)LAB',
    'B value (SPIN)LAB',
    'L value (SPEX)LAB',
    'A value (SPEX)LAB',
    'B value (SPEX)LAB',
  ];
};

const basicOptions = [
  'NAME',
  'TIMESTAMP',
  'APERTURE',
  'NETPROFILERSTATUS',
  'TRANSFORMID',
  'TRIGGER',
  'PROJECTID',
  'JOBID',
  'STANDARD',
];

const getCi62AllSamples = async () => {
  try {
    const header = getHeader();
    const data = await Promise.all(
      Array.from(
        { length: ci62.GetSampleCount() },
        (_, index) => index + 1,
      ).map(async (sampleIndex) => {
        const basicInfo = await getSampleInfo(
          basicOptions,
          sampleIndex,
          'SPIN',
        );
        const element = await getSampleData(sampleIndex);
        if (element) {
          await sleep(100);
          return [
            ...Object.values(basicInfo),
            ...element.reflectanceData.refSpinData,
            ...element.reflectanceData.refSpexData,
            ...element.LABData.labSpinData,
            ...element.LABData.labSpexData,
          ];
        }
        throw new Error('Error retrieving sample data from the device');
      }),
    );
    return { header, data, error: null };
  } catch (error) {
    return { header: [], data: [], error: error.message };
  }
};

const getCi62SampleCount = () => ci62.GetSampleCount();

const clearAllCi62Samples = () =>
  new Promise((resolve) => {
    try {
      const sampleCount = getCi62SampleCount();
      if (sampleCount === 0) {
        resolve({ res: false, message: 'There are no samples in the device' });
      } else {
        const clearRes = execQuery('SAMPLE CLEAR ALL');
        if (clearRes === '<00>') {
          resolve({
            res: true,
            message: 'All samples data has been cleared from the device',
          });
        } else {
          const error = getLastError();
          if (
            error.errorString === 'Receive: Timeout' ||
            error.errorCode === 20485
          ) {
            resolve({
              res: true,
              message: 'All samples data has been cleared from the device',
            });
          }
          resolve({
            res: false,
            message: error.errorString,
          });
        }
      }
    } catch (error) {
      resolve({
        res: false,
        message: 'Error accrued while clearing all samples',
      });
    }
  });

module.exports = {
  loadCi62LibraryFunctions,
  connectCi62Device,
  disconnectCi62Device,
  waitForCi62CalibrationComplete,
  getCi62WhiteCalibrationResult,
  waitForCi62MeasurementComplete,
  getCi62MeasurementData,
  setCi62DeviceConfiguration,
  getCi62SerialNumber,
  getBasicCi62DeviceInfo,
  checkCi62Calibration,
  updateCI62StartMeasure,
  getCi62AllSamples,
  clearAllCi62Samples,
  getCI62MeasureStatus,
  getCi62SampleCount,
  execQuery,
  performMeasurement,
};
