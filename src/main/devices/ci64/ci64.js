const koffi = require('koffi');
const path = require('path');
const { dialog } = require('electron');

let dllDir = null;
let ci64 = null;
let specularType = null;
let measureInterval = null;
let startMeasure = false;
const { getAssetPath } = require('../../util');

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

if (process.platform == 'win32') {
  dllDir = getAssetPath('SDK', 'Ci64', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci64 needs to expose here first
const loadCi64LibraryFunctions = () => {
  try {
    // Load the DLL
    ci64 = koffi.load(path.join(dllDir, 'Ci64.dll'));

    if (!ci64) {
      throw new Error('Failed to load Ci64 DLL');
    }

    // Expose DLL functions to Electron
    ci64.GetInterfaceVersion = ci64.stdcall(
      'GetInterfaceVersion',
      'string',
      [],
    );
    ci64.Connect = ci64.stdcall('Connect', 'bool', []);
    ci64.Disconnect = ci64.stdcall('Disconnect', 'bool', []);
    ci64.IsConnected = ci64.stdcall('IsConnected', 'bool', []);
    ci64.GetCalibrationStandard = ci64.stdcall(
      'GetCalibrationStandard',
      'string',
      [],
    );
    ci64.GetSerialNum = ci64.stdcall('GetSerialNum', 'string', []);
    ci64.GetSpectralSetCount = ci64.stdcall('GetSpectralSetCount', 'int', []);
    ci64.GetSpectralSetName = ci64.stdcall('GetSpectralSetName', 'string', [
      'int',
    ]);
    ci64.GetWavelengthCount = ci64.stdcall('GetWavelengthCount', 'int', []);
    ci64.GetWavelengthValue = ci64.stdcall('GetWavelengthValue', 'int', [
      'int',
    ]);
    ci64.Measure = ci64.stdcall('Measure', 'bool', []);
    ci64.IsDataReady = ci64.stdcall('IsDataReady', 'bool', []);
    ci64.GetSpectralData = ci64.stdcall('GetSpectralData', 'float', [
      'int',
      'int',
    ]);
    ci64.GetCalStatus = ci64.stdcall('GetCalStatus', 'int', []);
    ci64.GetCalSteps = ci64.stdcall('GetCalSteps', 'string', []);
    ci64.CalibrateStep = ci64.stdcall('CalibrateStep', 'bool', ['string']);
    ci64.GetCalMode = ci64.stdcall('GetCalMode', 'string', []);
    ci64.GetCalProgress = ci64.stdcall('GetCalProgress', 'int', []);
    ci64.AbortCalibration = ci64.stdcall('AbortCalibration', 'bool', []);
    ci64.ClearSamples = ci64.stdcall('ClearSamples', 'bool', []);
    ci64.GetSampleCount = ci64.stdcall('GetSampleCount', 'int', []);
    ci64.GetSampleData = ci64.stdcall('GetSampleData', 'float', ['int', 'int']);
    ci64.SetCurrentSample = ci64.stdcall('SetCurrentSample', 'bool', ['int']);
    ci64.GetAvailableSettings = ci64.stdcall(
      'GetAvailableSettings',
      'string',
      [],
    );
    ci64.GetSettingOptions = ci64.stdcall('GetSettingOptions', 'string', [
      'string',
    ]);
    ci64.GetOption = ci64.stdcall('GetOption', 'string', ['string']);
    ci64.SetOption = ci64.stdcall('SetOption', 'bool', ['string', 'string']);
    ci64.ScanIsSupported = ci64.stdcall('ScanIsSupported', 'bool', []);
    ci64.GetLastErrorCode = ci64.stdcall('GetLastErrorCode', 'int', []);
    ci64.GetLastErrorString = ci64.stdcall('GetLastErrorString', 'string', []);
    ci64.Execute = ci64.stdcall('Execute', 'string', ['string']);

    return ci64;
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing Ci64 Library Functions',
      message: `Error loading Ci64 library: ${error.message}`,
    });
    return null; // Return null in case of an error
  }
};

const connect = () => ci64.Connect();
const disconnect = () => ci64.Disconnect();
const getAvailableSettings = () => ci64.GetAvailableSettings();
const setOption = (option, value) => ci64.SetOption(option, value);
const setParam = (option, value) =>
  ci64.Execute(`PARAM SET ${option} ${value}`);

// generalSettings
const setAllOptions = (options) => {
  try {
    for (const key in options) {
      const isSet = setOption(key, options[key]);
      if (!isSet) {
        throw new Error(`Error setting ${key} - ${options[key]}`);
      }
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// get general settings
const getAllOptions = (options) => {
  try {
    const allOptions = {};
    for (const key in options) {
      const value = ci64.GetOption(key, options[key]);
      allOptions[key] = value;
    }
    return { res: true, allOptions, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// set ci64 device params
const setParams = (options) => {
  try {
    for (const key in options) {
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

const createCi64ConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const observer = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj.Specular = options.Specular;
  configObj.MeasAverageNum = options.MeasAverageNum;
  configObj.IllumObs = illuobsType[`${illumination}/${observer}`];
  return configObj;
};

// set ci64 device configuration settings
const setCi64DeviceConfiguration = (obj) => {
  const options = createCi64ConfigurationSettings(obj);
  try {
    for (const key in options) {
      if (key == 'Specular') {
        specularType = options[key];
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
const waitForCi64CalibrationComplete = (callback) => {
  // var calProgress = ci64.GetCalProgress();
  // or we can use command for this
  let calProgress = ci64.Execute('CALSTATUS GET');

  var interval = setInterval(() => {
    // calProgress = ci64.GetCalProgress();
    calProgress = ci64.Execute('CALSTATUS GET');

    // if (calProgress == 0) {
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

// manually perform calibration
const performCalibration = () => {
  try {
    const allSteps = ci64.GetCalSteps().split(';');

    allSteps.forEach((step) => {
      const res = ci64.CalibrateStep(step);

      if (!res) {
        throw new Error(`Calibration failed for ${step}`);
      }
    });
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const setDefaultTolarence = (options) => {
  try {
    for (const key in options) {
      const isSet = ci64.Execute(`DEFAULTTOL SET ${key} ${options[key]}`);

      if (!isSet) {
        throw new Error(`Error setting ${key} - ${options[key]}`);
      }
      const isStore = ci64.Execute(`DEFAULTTOL STORE`);
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
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

const convertFloatValues = (data) => {
  if (!data) return null;
  return data.map((x) => parseFloat(x));
};

// get reflective and LAB data of last measurement
const getCi64MeasurementData = () => {
  let refSpinData = null;
  let refSpexData = null;
  let labSpinData = null;
  let labSpexData = null;
  let reflectanceData = null;
  let LABData = null;
  try {
    if (specularType == 'SPIN') {
      refSpinData = ci64.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
      labSpinData = ci64.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
      reflectanceData = convertFloatValues(refSpinData);
      LABData = convertFloatValues(labSpinData);
    } else if (specularType == 'SPEX') {
      refSpexData = ci64.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
      labSpexData = ci64.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
      reflectanceData = convertFloatValues(refSpexData);
      LABData = convertFloatValues(labSpexData);
    } else if (specularType == 'SPIN_SPEX') {
      refSpinData = ci64.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
      labSpinData = ci64.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
      refSpexData = ci64.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
      labSpexData = ci64.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
      // to reset dataReady status to fail for next measurement wait
      var getSpectralData = ci64.GetSpectralData(0, 0);

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
    var getSpectralData = ci64.GetSpectralData(0, 0);

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
    // connection
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

// get serial number of ci64 device
const getCi64SerialNumber = () => {
  try {
    return ci64.GetSerialNum();
  } catch (error) {
    return null;
  }
};

// get basic device info
const getBasicCi64DeviceInfo = () => {
  try {
    const serialNumber = ci64.GetSerialNum();
    const interfaceVersion = ci64.GetInterfaceVersion();
    const calStatus = checkCi64Calibration();
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
    const timeout = parseInt(ci64.Execute('PARAM GET CalWhiteTimeout'));
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

const getCalibrationExpireTime = () => {
  const calStatus = ci64.Execute('CALSTATUS GET');
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
  return ci64.Execute(query);
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
        sampleInfo[key] = ci64.GetOption('NetProfiler');
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

const getCi64SampleCount = () => ci64.GetSampleCount();

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

const clearAllCi64Samples = () =>
  new Promise((resolve) => {
    try {
      const sampleCount = getCi64SampleCount();
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
  loadCi64LibraryFunctions,
  connectCi64Device,
  waitForCi64CalibrationComplete,
  getCi64WhiteCalibrationResult,
  waitForCi64MeasurementComplete,
  getCi64MeasurementData,
  setCi64DeviceConfiguration,
  getCi64SerialNumber,
  getBasicCi64DeviceInfo,
  disconnectCi64Device,
  checkCi64Calibration,
  updateCI64StartMeasure,
  clearAllCi64Samples,
  getCi64AllSamples,
  getCI64MeasureStatus,
  getCi64SampleCount,
  execQuery,
  performMeasurement,
};
