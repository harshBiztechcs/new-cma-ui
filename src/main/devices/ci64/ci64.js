/* eslint-disable no-plusplus */
/* eslint-disable no-console */
/* eslint-disable consistent-return */
const fs = require('fs');
const koffi = require('koffi');
const path = require('path');
const { dialog } = require('electron');
const { getAssetPath } = require('../../util');

let dllDir = null;
let ci64 = null;
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
  dllDir = getAssetPath('SDK', 'Ci64', 'x64', 'Ci64.dll');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci64 needs to expose here first
const loadCi64LibraryFunctions = () => {
  try {
    // Check if the DLL file exists
    // Load the DLL
    const ci64Library = koffi.load(dllDir);

    // Define the function signatures
    ci64 = {
      GetInterfaceVersion: ci64Library.func('GetInterfaceVersion', 'str', []),
      Connect: ci64Library.func('Connect', 'bool', []),
      Disconnect: ci64Library.func('Disconnect', 'bool', []),
      IsConnected: ci64Library.func('IsConnected', 'bool', []),
      GetCalibrationStandard: ci64Library.func(
        'GetCalibrationStandard',
        'str',
        [],
      ),
      GetSerialNum: ci64Library.func('GetSerialNum', 'str', []),
      GetSpectralSetCount: ci64Library.func('GetSpectralSetCount', 'int', []),
      GetSpectralSetName: ci64Library.func('GetSpectralSetName', 'str', [
        'int',
      ]),
      GetWavelengthCount: ci64Library.func('GetWavelengthCount', 'int', []),
      GetWavelengthValue: ci64Library.func('GetWavelengthValue', 'int', [
        'int',
      ]),
      Measure: ci64Library.func('Measure', 'bool', []),
      IsDataReady: ci64Library.func('IsDataReady', 'bool', []),
      GetSpectralData: ci64Library.func('GetSpectralData', 'float', [
        'int',
        'int',
      ]),
      GetCalStatus: ci64Library.func('GetCalStatus', 'int', []),
      GetCalSteps: ci64Library.func('GetCalSteps', 'str', []),
      CalibrateStep: ci64Library.func('CalibrateStep', 'bool', ['str']),
      GetCalMode: ci64Library.func('GetCalMode', 'str', []),
      GetCalProgress: ci64Library.func('GetCalProgress', 'int', []),
      AbortCalibration: ci64Library.func('AbortCalibration', 'bool', []),
      ClearSamples: ci64Library.func('ClearSamples', 'bool', []),
      GetSampleCount: ci64Library.func('GetSampleCount', 'int', []),
      GetSampleData: ci64Library.func('GetSampleData', 'float', ['int', 'int']),
      SetCurrentSample: ci64Library.func('SetCurrentSample', 'bool', ['int']),
      GetAvailableSettings: ci64Library.func('GetAvailableSettings', 'str', []),
      GetSettingOptions: ci64Library.func('GetSettingOptions', 'str', ['str']),
      GetOption: ci64Library.func('GetOption', 'str', ['str']),
      SetOption: ci64Library.func('SetOption', 'bool', ['str', 'str']),
      ScanIsSupported: ci64Library.func('ScanIsSupported', 'bool', []),
      GetLastErrorCode: ci64Library.func('GetLastErrorCode', 'int', []),
      GetLastErrorString: ci64Library.func('GetLastErrorString', 'str', []),
      Execute: ci64Library.func('Execute', 'str', ['str']),
    };
  } catch (error) {
    console.error('Error loading ci64 library:', error);
    dialog.showMessageBox(null, {
      title: 'Exposing Ci64 Library Functions',
      message: `Error loading Ci64 library :- ${error.message} && DLL file exists =>${fs.existsSync(dllDir) ? 'yes' : 'no'} `,
    });
    return null; // Return null in case of an error
  }
};

const connect = () => ci64.Connect();
const disconnect = () => ci64.Disconnect();
const setParam = (option, value) =>
  ci64.Execute(`PARAM SET ${option} ${value}`);

// get serial number of ci64 device
const getCi64SerialNumber = () => {
  try {
    return ci64.GetSerialNum();
  } catch (error) {
    return null;
  }
};

// get last error info
const getLastError = () => {
  const errorCode = ci64.GetLastErrorCode();
  const errorString = ci64.GetLastErrorString();
  return { errorCode, errorString };
};

// performs connection to ci64 device
const connectCi64Device = () => {
  try {
    // connection
    if (ci64.IsConnected()) return { res: true, error: null };
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

const disconnectCi64Device = () => {
  try {
    if (!ci64.IsConnected()) return { res: true, error: null };
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

const createCi64ConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const obsrever = options['Colorimetric.Observer'] === 'TwoDegree' ? 2 : 10;
  configObj.Specular = options.Specular;
  configObj.MeasAverageNum = options.MeasAverageNum;
  configObj.IllumObs = illuobsType[`${illumination}/${obsrever}`];
  return configObj;
};

// set ci64 device configuration settings
const setCi64DeviceConfiguration = (obj) => {
  const options = createCi64ConfigurationSettings(obj);

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
const waitForCi64CalibrationComplete = (callback) => {
  const getCalibrationStatus = () => ci64.Execute('CALSTATUS GET');

  let calProgress = getCalibrationStatus();

  const interval = setInterval(() => {
    calProgress = getCalibrationStatus();
    if (calProgress.includes('OK')) {
      clearInterval(interval);
      callback();
    }
  }, 500);
};

// get ci64 white calibration result
const getCi64WhiteCalibrationResult = () => {
  try {
    const spinWhiteCalibrationValue = ci64.Execute('CALPLAQUE GET SPIN');
    const spexWhiteCalValue = ci64.Execute('CALPLAQUE GET SPEX');
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
    const res = ci64.Measure();
    if (!res) {
      return { res: false, error: getLastError() };
    }
    return { res: true };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const isDataReady = () => ci64.IsDataReady();

// change status of startMeasure
const updateCI64StartMeasure = (value) => {
  startMeasure = value;
};

const getCI64MeasureStatus = () => {
  return startMeasure;
};

// wait for measurement to complete
const waitForCi64MeasurementComplete = (callback) => {
  try {
    // flush last data ready status
    ci64.GetSpectralData(0, 0);

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
  const refSpinData = ci64.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
  const labSpinData = ci64.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
  return {
    reflectanceData: convertFloatValues(refSpinData),
    LABData: convertFloatValues(labSpinData),
  };
};

const getSpexData = () => {
  const refSpexData = ci64.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
  const labSpexData = ci64.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
  return {
    reflectanceData: convertFloatValues(refSpexData),
    LABData: convertFloatValues(labSpexData),
  };
};

const getSpinAndSpexData = () => {
  const refSpinData = ci64.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
  const labSpinData = ci64.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
  const refSpexData = ci64.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
  const labSpexData = ci64.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
  return {
    SPINREFData: convertFloatValues(refSpinData),
    SPINLABData: convertFloatValues(labSpinData),
    SPEXREFData: convertFloatValues(refSpexData),
    SPEXLABData: convertFloatValues(labSpexData),
  };
};

const getCi64MeasurementData = () => {
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
    ci64.GetSpectralData(0, 0);
    specularType = null;
    return { res: true, ...data };
  } catch (error) {
    specularType = null;
    return { res: false, error: error?.message };
  }
};

const getCalibrationExpireTime = () => {
  const calStatus = ci64.Execute('CALSTATUS GET');
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
      ci64.Execute('PARAM GET CalWhiteTimeout'),
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

const checkCi64Calibration = () => {
  try {
    const calStatus = ci64.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const getBasicCi64DeviceInfo = () => {
  try {
    const [serialNumber, interfaceVersion, timeSinceLastCal] = [
      ci64.GetSerialNum(),
      ci64.GetInterfaceVersion(),
      getTimeSinceLastCalibration(),
    ];

    const calStatus = checkCi64Calibration();
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
  return ci64.Execute(query);
};

const getSampleData = (index) => {
  const sampleData = {};
  try {
    sampleData.reflectanceData = {
      refSpinData: convertFloatValues(
        ci64.Execute(`SAMPLE GET REFL ${index} SPIN`).split(' '),
      ),
      refSpexData: convertFloatValues(
        ci64.Execute(`SAMPLE GET REFL ${index} SPEX`).split(' '),
      ),
    };
    sampleData.LABData = {
      labSpinData: convertFloatValues(
        ci64.Execute(`SAMPLE GET LAB ${index} SPIN`).split(' '),
      ),
      labSpexData: convertFloatValues(
        ci64.Execute(`SAMPLE GET LAB ${index} SPEX`).split(' '),
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
        sampleInfo[key] = ci64.GetOption('NetProfiler');
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

const getCi64AllSamples = () =>
  new Promise((resolve) => {
    try {
      let error = null;
      const data = [];
      const header =
        'Name,TimeStamp,Aperture,NetProfiler Status,Transform,Trigger Mode,Project ID,Job ID,Standard,400 nm (SPIN),410 nm (SPIN),420 nm (SPIN),430 nm (SPIN),440 nm (SPIN),450 nm (SPIN),460 nm (SPIN),470 nm (SPIN),480 nm (SPIN),490 nm (SPIN),500 nm (SPIN),510 nm (SPIN),520 nm (SPIN),530 nm (SPIN),540 nm (SPIN),550 nm (SPIN),560 nm (SPIN),570 nm (SPIN),580 nm (SPIN),590 nm (SPIN),600 nm (SPIN),610 nm (SPIN),620 nm (SPIN),630 nm (SPIN),640 nm (SPIN),650 nm (SPIN),660 nm (SPIN),670 nm (SPIN),680 nm (SPIN),690 nm (SPIN),700 nm (SPIN),400 nm (SPEX),410 nm (SPEX),420 nm (SPEX),430 nm (SPEX),440 nm (SPEX),450 nm (SPEX),460 nm (SPEX),470 nm (SPEX),480 nm (SPEX),490 nm (SPEX),500 nm (SPEX),510 nm (SPEX),520 nm (SPEX),530 nm (SPEX),540 nm (SPEX),550 nm (SPEX),560 nm (SPEX),570 nm (SPEX),580 nm (SPEX),590 nm (SPEX),600 nm (SPEX),610 nm (SPEX),620 nm (SPEX),630 nm (SPEX),640 nm (SPEX),650 nm (SPEX),660 nm (SPEX),670 nm (SPEX),680 nm (SPEX),690 nm (SPEX),700 nm (SPEX),L value (SPIN)LAB,A value (SPIN)LAB,B value (SPIN)LAB,L value (SPEX)LAB,A value (SPEX)LAB,B value (SPEX)LAB'.split(
          ',',
        );
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
      const totalSamples = ci64.GetSampleCount();
      if (totalSamples) {
        for (let index = 1; index <= totalSamples; index++) {
          const getBasicInfo = getSampleInfo(basicOptions, index, 'SPIN');

          const element = getSampleData(index);

          if (element) {
            data.push([
              ...Object.values(getBasicInfo),
              ...element.reflectanceData.refSpinData,
              ...element.reflectanceData.refSpexData,
              ...element.LABData.labSpinData,
              ...element.LABData.labSpexData,
            ]);
          } else {
            error = 'Error retrieving sample data from the device';
            resolve({ header, data, error });
          }
        }
      }
      resolve({ header, data, error });
    } catch (error) {
      resolve({ header: [], data: [], error: error.message });
    }
  });

const getCi64SampleCount = () => ci64.GetSampleCount();

const clearAllCi64Samples = () =>
  new Promise((resolve) => {
    try {
      const sampleCount = getCi64SampleCount();
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

// Export Measurement Data
const getCi64SingleSamples = (SpecularCi64) => {
  return new Promise((resolve) => {
    const processSampleData = async () => {
      try {
        const totalSamples = ci64.GetSampleCount();
        console.log({ totalSamples });

        if (totalSamples > 0) {
          const sampleElement = await getSampleData(0);

          if (sampleElement) {
            let reflectanceData;
            let LABData;

            if (SpecularCi64 === 'SPIN') {
              reflectanceData = sampleElement.reflectanceData.refSpinData;
              LABData = sampleElement.LABData.labSpinData;
            } else if (SpecularCi64 === 'SPEX') {
              reflectanceData = sampleElement.reflectanceData.refSpexData;
              LABData = sampleElement.LABData.labSpexData;
            } else if (SpecularCi64 === 'SPIN_SPEX') {
              resolve({
                res: true,
                SPEXLABData: sampleElement.LABData.labSpexData,
                SPEXREFData: sampleElement.reflectanceData.refSpexData,
                SPINLABData: sampleElement.LABData.labSpinData,
                SPINREFData: sampleElement.reflectanceData.refSpinData,
              });
              return;
            }

            resolve({
              res: true,
              reflectanceData,
              LABData,
            });
          } else {
            resolve({ error: 'Error retrieving sample data from the device' });
          }
        } else {
          resolve({ error: 'No samples found on the device' });
        }
      } catch (error) {
        resolve({ error: error.message });
      }
    };

    processSampleData();
  });
};

module.exports = {
  loadCi64LibraryFunctions,
  connectCi64Device,
  disconnectCi64Device,
  waitForCi64CalibrationComplete,
  getCi64WhiteCalibrationResult,
  waitForCi64MeasurementComplete,
  getCi64MeasurementData,
  setCi64DeviceConfiguration,
  getCi64SerialNumber,
  getBasicCi64DeviceInfo,
  checkCi64Calibration,
  updateCI64StartMeasure,
  getCi64AllSamples,
  clearAllCi64Samples,
  getCI64MeasureStatus,
  getCi64SampleCount,
  execQuery,
  performMeasurement,
  getCi64SingleSamples,
};
