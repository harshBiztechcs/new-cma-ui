/* eslint-disable no-console */
/* eslint-disable consistent-return */
const fs = require('fs');
const koffi = require('koffi');
const path = require('path');
const { dialog } = require('electron');
const { getAssetPath } = require('../../util');

let dllDir = null;
let ci64UV = null;
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
  dllDir = getAssetPath('SDK', 'Ci64UV', 'x64', 'Ci64UV.dll');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci64UV needs to expose here first
const loadCi64UVLibraryFunctions = () => {
  try {
    // Load the DLL
    const ci62UVLibrary = koffi.load(dllDir);

    // Define the function signatures
    ci64UV = {
      GetInterfaceVersion: ci62UVLibrary.func('GetInterfaceVersion', 'str', []),
      Connect: ci62UVLibrary.func('Connect', 'bool', []),
      Disconnect: ci62UVLibrary.func('Disconnect', 'bool', []),
      IsConnected: ci62UVLibrary.func('IsConnected', 'bool', []),
      GetCalibrationStandard: ci62UVLibrary.func(
        'GetCalibrationStandard',
        'str',
        [],
      ),
      GetSerialNum: ci62UVLibrary.func('GetSerialNum', 'str', []),
      GetSpectralSetCount: ci62UVLibrary.func('GetSpectralSetCount', 'int', []),
      GetSpectralSetName: ci62UVLibrary.func('GetSpectralSetName', 'str', [
        'int',
      ]),
      GetWavelengthCount: ci62UVLibrary.func('GetWavelengthCount', 'int', []),
      GetWavelengthValue: ci62UVLibrary.func('GetWavelengthValue', 'int', [
        'int',
      ]),
      Measure: ci62UVLibrary.func('Measure', 'bool', []),
      IsDataReady: ci62UVLibrary.func('IsDataReady', 'bool', []),
      GetSpectralData: ci62UVLibrary.func('GetSpectralData', 'float', [
        'int',
        'int',
      ]),
      GetCalStatus: ci62UVLibrary.func('GetCalStatus', 'int', []),
      GetCalSteps: ci62UVLibrary.func('GetCalSteps', 'str', []),
      CalibrateStep: ci62UVLibrary.func('CalibrateStep', 'bool', ['str']),
      GetCalMode: ci62UVLibrary.func('GetCalMode', 'str', []),
      GetCalProgress: ci62UVLibrary.func('GetCalProgress', 'int', []),
      AbortCalibration: ci62UVLibrary.func('AbortCalibration', 'bool', []),
      ClearSamples: ci62UVLibrary.func('ClearSamples', 'bool', []),
      GetSampleCount: ci62UVLibrary.func('GetSampleCount', 'int', []),
      GetSampleData: ci62UVLibrary.func('GetSampleData', 'float', [
        'int',
        'int',
      ]),
      SetCurrentSample: ci62UVLibrary.func('SetCurrentSample', 'bool', ['int']),
      GetAvailableSettings: ci62UVLibrary.func(
        'GetAvailableSettings',
        'str',
        [],
      ),
      GetSettingOptions: ci62UVLibrary.func('GetSettingOptions', 'str', [
        'str',
      ]),
      GetOption: ci62UVLibrary.func('GetOption', 'str', ['str']),
      SetOption: ci62UVLibrary.func('SetOption', 'bool', ['str', 'str']),
      ScanIsSupported: ci62UVLibrary.func('ScanIsSupported', 'bool', []),
      GetLastErrorCode: ci62UVLibrary.func('GetLastErrorCode', 'int', []),
      GetLastErrorString: ci62UVLibrary.func('GetLastErrorString', 'str', []),
      Execute: ci62UVLibrary.func('Execute', 'str', ['str']),
    };
  } catch (error) {
    console.error('Error loading Ci64UV library:', error);
    dialog.showMessageBox(null, {
      title: 'Exposing Ci64UV Library Functions',
      message: `Error loading Ci64UV library :- ${error.message} && DLL file exists =>${fs.existsSync(dllDir) ? 'yes' : 'no'} `,
    });
    return null; // Return null in case of an error
  }
};
const connect = () => ci64UV.Connect();
const disconnect = () => ci64UV.Disconnect();
const setOption = (option, value) => ci64UV.SetOption(option, value);
const setParam = (option, value) =>
  ci64UV.Execute(`PARAM SET ${option} ${value}`);

const createCi64UVConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const observer = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj.Specular = options.Specular;
  configObj.MeasAverageNum = options.MeasAverageNum;
  configObj.IllumObs = illuobsType[`${illumination}/${observer}`];
  if (options.MeasurementMode)
    configObj.MeasurementMode = options.MeasurementMode;
  return configObj;
};

// get last error info
const getLastError = () => {
  const errorCode = ci64UV.GetLastErrorCode();
  const errorString = ci64UV.GetLastErrorString();
  return { errorCode, errorString };
};

// set ci64UV device configuration settings
const setCi64UVDeviceConfiguration = (obj) => {
  const options = createCi64UVConfigurationSettings(obj);
  try {
    for (const key in options) {
      if (key == 'Specular') {
        specularType = options[key];
        continue;
      }

      if (key == 'MeasurementMode') {
        const isSet = setOption('Measurement_Mode', options[key]);
        if (!isSet) {
          throw new Error(`Error setting ${key} - ${options[key]}`);
        }
        continue;
      }

      const isSet = setParam(key, options[key]);
      if (!(isSet == '<00>')) {
        throw new Error(`Error setting ${key} - ${options[key]}`);
      }
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// common helper function to wait for calibration to complete,
// passed callback function will be called after calibration done
const waitForCi64UVCalibrationComplete = (callback) => {
  // var calProgress = ci64UV.GetCalProgress();
  // or we can use command for this
  let calProgress = ci64UV.Execute('CALSTATUS GET');

  var interval = setInterval(() => {
    // calProgress = ci64UV.GetCalProgress();
    calProgress = ci64UV.Execute('CALSTATUS GET');

    // if (calProgress == 0) {
    if (calProgress.includes('OK')) {
      clearInterval(interval);
      callback();
    }
  }, 500);
};

// get ci64UV white calibration result
const getCi64UVWhiteCalibrationResult = () => {
  try {
    const spinWhiteCalibrationValue = ci64UV.Execute('CALPLAQUE GET SPIN');
    const spexWhiteCalValue = ci64UV.Execute('CALPLAQUE GET SPEX');
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
    const res = ci64UV.Measure();

    if (!res) {
      return { res: false, error: getLastError() };
    }
    return { res: true };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const isDataReady = () => ci64UV.IsDataReady();

// change status of startMeasure
const updateCI64UVStartMeasure = (value) => {
  startMeasure = value;
};

const getCI64UVMeasureStatus = () => {
  return startMeasure;
};

// wait for measurement to complete
const waitForCi64UVMeasurementComplete = (callback) => {
  try {
    // flush last data ready status
    ci64UV.GetSpectralData(0, 0);

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

const convertFloatValues = (data) => {
  if (!data) return null;
  return data.map((x) => parseFloat(x));
};

// get reflective and LAB data of last measurement
const getCi64UVMeasurementData = () => {
  let refSpinData = null;
  let refSpexData = null;
  let labSpinData = null;
  let labSpexData = null;
  let reflectanceData = null;
  let LABData = null;
  try {
    if (specularType == 'SPIN') {
      refSpinData = ci64UV.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
      labSpinData = ci64UV.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
      reflectanceData = convertFloatValues(refSpinData);
      LABData = convertFloatValues(labSpinData);
    } else if (specularType == 'SPEX') {
      refSpexData = ci64UV.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
      labSpexData = ci64UV.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
      reflectanceData = convertFloatValues(refSpexData);
      LABData = convertFloatValues(labSpexData);
    } else if (specularType == 'SPIN_SPEX') {
      refSpinData = ci64UV.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
      labSpinData = ci64UV.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
      refSpexData = ci64UV.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
      labSpexData = ci64UV.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
      // to reset dataReady status to fail for next measurement wait
      var getSpectralData = ci64UV.GetSpectralData(0, 0);

      specularType == null;
      return {
        res: true,
        SPINREFData: convertFloatValues(refSpinData),
        SPINLABData: convertFloatValues(labSpinData),
        SPEXREFData: convertFloatValues(refSpexData),
        SPEXLABData: convertFloatValues(labSpexData),
      };
    }
    // to reset dataReady status to fail for next measurement wait
    var getSpectralData = ci64UV.GetSpectralData(0, 0);

    specularType == null;
    return {
      res: true,
      reflectanceData,
      LABData,
    };
  } catch (error) {
    specularType == null;
    return { res: false, error: error?.message };
  }
};

// performs connection to ci64UV device
const connectCi64UVDevice = () => {
  try {
    // connection
    if (ci64UV.IsConnected()) return { res: true, error: null };
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

const disconnectCi64UVDevice = () => {
  try {
    // connection
    if (!ci64UV.IsConnected()) return { res: true, error: null };
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

// get serial number of ci64UV device
const getCi64UVSerialNumber = () => {
  try {
    return ci64UV.GetSerialNum();
  } catch (error) {
    return null;
  }
};

// get basic device info
const getBasicCi64UVDeviceInfo = () => {
  try {
    const serialNumber = ci64UV.GetSerialNum();
    const interfaceVersion = ci64UV.GetInterfaceVersion();
    const calStatus = checkCi64UVCalibration();
    let calExpireIn = 0;
    const timeSinceLastCal = getTimeSinceLastCalibration();
    if (calStatus) {
      calExpireIn = getCalibrationExpireTime();
    }
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

const getTimeSinceLastCalibration = () => {
  try {
    const timeout = parseInt(ci64UV.Execute('PARAM GET CalWhiteTimeout'));
    if (timeout) {
      return timeout * 3600 - getCalibrationExpireTime();
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

const checkCi64UVCalibration = () => {
  try {
    const calStatus = ci64UV.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const getCalibrationExpireTime = () => {
  const calStatus = ci64UV.Execute('CALSTATUS GET');
  if (calStatus.includes('OK')) {
    try {
      const expireIn = calStatus.split(' ')[2];
      return parseInt(expireIn) * 60;
    } catch (error) {
      return 0;
    }
  }
  return 0;
};

// Export Measurement Data
const execQuery = (query) => {
  return ci64UV.Execute(query);
};

const getTransformName = (index) => {
  if (index == 7) {
    return 'None';
  }
  if (index == 8) {
    return execQuery('TRANSFORM GET NAME');
  }
  const allTransform = execQuery('TRANSFORM GET NAMES').split(' ');
  if (allTransform.length == index) {
    return allTransform[index];
  }
  return '';
};

const getSampleInfo = (options, index, geometry) => {
  const sampleInfo = {};
  try {
    options.forEach((key) => {
      if (key == 'NETPROFILERSTATUS') {
        sampleInfo[key] = ci64UV.GetOption('NetProfiler');
      } else if (key == 'TRANSFORMID') {
        sampleInfo[key] = getTransformName(
          execQuery(`SAMPLE GET ${key} ${index} ${geometry}`),
        );
      } else if (key == 'NAME') {
        sampleInfo[key] = '';
      } else if (key == 'JOBID') {
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

const getSampleData = (index) => {
  const sampleData = {};
  try {
    sampleData.reflectanceData = {
      refSpinData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET REFL ${index} SPIN`).split(' '),
      ),
      refSpexData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET REFL ${index} SPEX`).split(' '),
      ),
    };
    sampleData.LABData = {
      labSpinData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET LAB ${index} SPIN`).split(' '),
      ),
      labSpexData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET LAB ${index} SPEX`).split(' '),
      ),
    };
    if (
      sampleData.reflectanceData.refSpinData.length == 31 &&
      sampleData.reflectanceData.refSpexData.length == 31 &&
      sampleData.LABData.labSpinData.length == 3 &&
      sampleData.LABData.labSpexData.length == 3
    ) {
      return sampleData;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getCi64UVSampleCount = () => ci64UV.GetSampleCount();

const getCi64UVAllSamples = () =>
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
      const totalSamples = ci64UV.GetSampleCount();
      if (totalSamples) {
        for (let index = 1; index <= totalSamples; index++) {
          const basicInfo = [];
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

const clearAllCi64UVSamples = () =>
  new Promise((resolve) => {
    try {
      const sampleCount = getCi64UVSampleCount();
      if (sampleCount == 0) {
        resolve({ res: false, message: 'There are no samples in the device' });
      } else {
        const clearRes = execQuery('SAMPLE CLEAR ALL');

        if (clearRes == '<00>') {
          resolve({
            res: true,
            message: 'All samples data has been cleared from the device',
          });
        } else {
          const error = getLastError();
          if (
            error.errorString == 'Receive: Timeout' ||
            error.errorCode == 20485
          ) {
            resolve({
              res: true,
              message:
                'All samples data has been cleared from the device with timeout',
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
  loadCi64UVLibraryFunctions,
  connectCi64UVDevice,
  waitForCi64UVCalibrationComplete,
  getCi64UVWhiteCalibrationResult,
  waitForCi64UVMeasurementComplete,
  getCi64UVMeasurementData,
  setCi64UVDeviceConfiguration,
  getCi64UVSerialNumber,
  getBasicCi64UVDeviceInfo,
  disconnectCi64UVDevice,
  checkCi64UVCalibration,
  updateCI64UVStartMeasure,
  clearAllCi64UVSamples,
  getCi64UVAllSamples,
  getCI64UVMeasureStatus,
  getCi64UVSampleCount,
  execQuery,
  performMeasurement,
};
