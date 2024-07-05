const koffi = require('koffi');
const { dialog } = require('electron');
const path = require('path');
const { getAssetPath } = require('../../util');

let dllDir = null;
if (process.platform === 'win32') {
  dllDir = getAssetPath('SDK', 'eXact', 'win', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
} else if (process.platform === 'darwin') {
  dllDir = getAssetPath('SDK', 'eXact', 'mac', 'x86_64');
}

let exact = null;
let filterType = 'M0';
let startMeasure = false;
let measureInterval = null;
let measAvgNum = 1;
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

// constant
const M0_M2_M3 = 'M0_M2_M3';

const loadExactLibraryFunctions = () => {
  try {
    exact = koffi.load(path.join(dllDir, 'eXact'));

    if (!exact) {
      throw new Error('Failed to load eXact DLL');
    }

    // Expose DLL functions to Electron
    exact.GetInterfaceVersion = exact.stdcall(
      'GetInterfaceVersion',
      'string',
      [],
    );
    exact.Connect = exact.stdcall('Connect', 'bool', []);
    exact.Disconnect = exact.stdcall('Disconnect', 'bool', []);
    exact.IsConnected = exact.stdcall('IsConnected', 'bool', []);
    exact.GetCalibrationStandard = exact.stdcall(
      'GetCalibrationStandard',
      'string',
      [],
    );
    exact.GetSerialNum = exact.stdcall('GetSerialNum', 'string', []);
    exact.GetSpectralSetCount = exact.stdcall('GetSpectralSetCount', 'int', []);
    exact.GetSpectralSetName = exact.stdcall('GetSpectralSetName', 'string', [
      'int',
    ]);
    exact.GetWavelengthCount = exact.stdcall('GetWavelengthCount', 'int', []);
    exact.GetWavelengthValue = exact.stdcall('GetWavelengthValue', 'int', [
      'int',
    ]);
    exact.Measure = exact.stdcall('Measure', 'bool', []);
    exact.IsDataReady = exact.stdcall('IsDataReady', 'bool', []);
    exact.GetSpectralData = exact.stdcall('GetSpectralData', 'float', [
      'int',
      'int',
    ]);
    exact.GetCalStatus = exact.stdcall('GetCalStatus', 'int', []);
    exact.GetCalSteps = exact.stdcall('GetCalSteps', 'string', []);
    exact.CalibrateStep = exact.stdcall('CalibrateStep', 'bool', ['string']);
    exact.GetCalMode = exact.stdcall('GetCalMode', 'string', []);
    exact.GetCalProgress = exact.stdcall('GetCalProgress', 'int', []);
    exact.AbortCalibration = exact.stdcall('AbortCalibration', 'bool', []);
    exact.ClearSamples = exact.stdcall('ClearSamples', 'bool', []);
    exact.GetSampleCount = exact.stdcall('GetSampleCount', 'int', []);
    exact.GetSampleData = exact.stdcall('GetSampleData', 'float', [
      'int',
      'int',
    ]);
    exact.SetCurrentSample = exact.stdcall('SetCurrentSample', 'bool', ['int']);
    exact.GetAvailableSettings = exact.stdcall(
      'GetAvailableSettings',
      'string',
      [],
    );
    exact.GetSettingOptions = exact.stdcall('GetSettingOptions', 'string', [
      'string',
    ]);
    exact.GetOption = exact.stdcall('GetOption', 'string', ['string']);
    exact.SetOption = exact.stdcall('SetOption', 'bool', ['string', 'string']);
    exact.ScanIsSupported = exact.stdcall('ScanIsSupported', 'bool', []);
    exact.GetLastErrorCode = exact.stdcall('GetLastErrorCode', 'int', []);
    exact.GetLastErrorString = exact.stdcall(
      'GetLastErrorString',
      'string',
      [],
    );
    exact.Execute = exact.stdcall('Execute', 'string', ['string']);

    return exact;
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing Exact Library Functions',
      message: `Error loading Exact library: ${error.message}`,
    });
    return null; // Return null in case of an error
  }
};

const connect = () => exact.Connect();
const disconnect = () => exact.Disconnect();
const isDataReady = () => exact.IsDataReady();
const setParam = (option, value) =>
  exact.Execute(`PARAM SET ${option} ${value}`);

// get last error info
const getLastError = () => {
  const errorCode = exact.GetLastErrorCode();
  const errorString = exact.GetLastErrorString();
  return { errorCode, errorString };
};

// performs connection to exact device
const connectExactDevice = () => {
  try {
    // connection
    if (exact.IsConnected()) return { res: true, error: null };
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

// get serial number of exact device
const getExactSerialNumber = () => {
  try {
    return exact.GetSerialNum();
  } catch (error) {
    return null;
  }
};

// get basic info of exact device
const getBasicExactDeviceInfo = () => {
  try {
    const serialNumber = exact.GetSerialNum();
    const interfaceVersion = exact.GetInterfaceVersion();
    const calStatus = checkExactCalibration();
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
    const timeout = parseInt(exact.Execute('PARAM GET CalWhiteTimeout'));
    if (timeout) {
      return timeout * 3600 - getCalibrationExpireTime();
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

const getCalibrationExpireTime = () => {
  const calStatus = exact.Execute('CALSTATUS GET');
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

const checkExactCalibration = () => {
  try {
    const calStatus = exact.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const disconnectExactDevice = () => {
  try {
    // connection
    if (!exact.IsConnected()) return { res: true, error: null };
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

const createExactConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const obsrever = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj.ResultIndexKey = options.ResultIndexKey;
  configObj.MeasAverageNum = options.MeasAverageNum;
  configObj.IllumObs = illuobsType[`${illumination}/${obsrever}`];
  if (options.DensityStatus) {
    configObj.DENSITYSTATUS = options.DensityStatus;
  }
  return configObj;
};

// set exact device configuration
const setExactDeviceConfiguration = (obj) => {
  const options = createExactConfigurationSettings(obj);
  try {
    for (const key in options) {
      if (key == 'MeasAverageNum') {
        try {
          measAvgNum = Number(options[key]);
          measAvgNum = measAvgNum ?? 1;
        } catch (error) {
          measAvgNum = 1;
        }
        continue;
      }
      if (key == 'ResultIndexKey') {
        const res = exact.Execute('MEAS GET FILTERPOSITION');
        if (options[key] == 'M1') {
          if (res == '0') {
            throw new Error(
              `Device isn't configured to support M1 measurement. Please configure device for M1 first and try again`,
            );
          }
        } else if (res == '1') {
          throw new Error(
            `Device isn't configured to support ${options[key]} measurement. Please configure device for ${options[key]} first and try again`,
          );
        }
        filterType = options[key];
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
const waitForExactCalibrationComplete = (callback) => {
  // var calProgress = exact.GetCalProgress();
  // or we can use command for this
  let calProgress = exact.Execute('CALSTATUS GET');

  var interval = setInterval(() => {
    // calProgress = exact.GetCalProgress();
    calProgress = exact.Execute('CALSTATUS GET');

    // if (calProgress == 0) {
    if (calProgress.includes('OK')) {
      clearInterval(interval);
      callback();
    }
  }, 500);
};

// get exact white calibration result
const getExactWhiteCalibrationResult = () => {
  try {
    const spinWhiteCalibrationValue = exact.Execute('CALPLAQUE GET SPIN');
    const spexWhiteCalValue = exact.Execute('CALPLAQUE GET SPEX');
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
    console.log(
      `error log before measurement ${exact.Execute('ERRORLOG GET')}`,
    );
    const res = exact.Measure();

    if (!res) {
      return { res: false, error: getLastError() };
    }
    return { res: true };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// change status of startMeasure
const updateExactStartMeasure = (value) => {
  startMeasure = value;
};

const getExactMeasureStatus = () => {
  return startMeasure;
};

// wait for measurement to complete
const waitForExactMeasurementComplete = (callback) => {
  try {
    // flush last data ready status
    exact.GetSpectralData(0, 0);

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

// common function to get average of data array
const getAverageData = (data, averageOf) => {
  const avgData = [];
  for (let i = 0; i < data[0].length; i++) {
    avgData[i] = 0;
    for (let j = 0; j < averageOf; j++) {
      avgData[i] = avgData[i] + data[j][i];
    }
    avgData[i] = avgData[i] / averageOf;
  }
  return avgData;
};

const getFilterExactMeasurementData = (filterType) => {
  try {
    let reflectanceData = exact.Execute(`SAMPLE GET REFL 0 ${filterType}`);
    let LABData = exact.Execute(`SAMPLE GET LAB 0 ${filterType}`);
    reflectanceData = convertFloatValues(reflectanceData.split(' '));
    LABData = convertFloatValues(LABData.split(' '));
    // to reset dataReady status to fail for next measurement wait
    exact.GetSpectralData(0, 0);
    return {
      res: true,
      reflectanceData,
      LABData,
    };
  } catch (error) {
    filterType = 'M0';
    return { res: false, error: error?.message };
  }
};

const getExactMeasurementData = () => {
  try {
    let reflectanceData = exact.Execute(`SAMPLE GET REFL 0 ${filterType}`);
    let LABData = exact.Execute(`SAMPLE GET LAB 0 ${filterType}`);
    reflectanceData = convertFloatValues(reflectanceData.split(' '));
    LABData = convertFloatValues(LABData.split(' '));
    // to reset dataReady status to fail for next measurement wait
    exact.GetSpectralData(0, 0);
    return {
      res: true,
      reflectanceData,
      LABData,
    };
  } catch (error) {
    filterType = 'M0';
    return { res: false, error: error?.message };
  }
};

const getAvgM0M2M3MeasurementData = () => {
  try {
    const M0SpectrumData = [];
    const M2SpectrumData = [];
    const M3SpectrumData = [];
    const M0LABData = [];
    const M2LABData = [];
    const M3LABData = [];
    let avgM0SpectrumData = [];
    let avgM2SpectrumData = [];
    let avgM3SpectrumData = [];
    let avgM0LABData = [];
    let avgM2LABData = [];
    let avgM3LABData = [];
    const spectrumData = [];
    const LABData = [];
    const avgSpectrumData = [];
    const avgLABData = [];
    const M0FirstMeasData = getFilterExactMeasurementData('M0');
    const M2FirstMeasData = getFilterExactMeasurementData('M2');
    const M3FirstMeasData = getFilterExactMeasurementData('M3');
    M0SpectrumData[0] = M0FirstMeasData.reflectanceData;
    M2SpectrumData[0] = M2FirstMeasData.reflectanceData;
    M3SpectrumData[0] = M3FirstMeasData.reflectanceData;
    M0LABData[0] = M0FirstMeasData.LABData;
    M2LABData[0] = M2FirstMeasData.LABData;
    M3LABData[0] = M3FirstMeasData.LABData;
    for (let i = 1; i < measAvgNum; i++) {
      const measRes = performMeasurement();
      if (measRes.res) {
        // get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        const M0MeasData = getFilterExactMeasurementData('M0');
        const M2MeasData = getFilterExactMeasurementData('M2');
        const M3MeasData = getFilterExactMeasurementData('M3');
        M0SpectrumData[i] = M0MeasData.reflectanceData;
        M2SpectrumData[i] = M2MeasData.reflectanceData;
        M3SpectrumData[i] = M3MeasData.reflectanceData;
        M0LABData[i] = M0MeasData.LABData;
        M2LABData[i] = M2MeasData.LABData;
        M3LABData[i] = M3MeasData.LABData;
      } else {
        const error = getLastError();

        return {
          res: false,
          measData: {
            reflectanceData: null,
            LABData: null,
          },
          error: error.errorString,
        };
      }
    }

    avgM0SpectrumData = getAverageData(M0SpectrumData, measAvgNum);
    avgM2SpectrumData = getAverageData(M2SpectrumData, measAvgNum);
    avgM3SpectrumData = getAverageData(M3SpectrumData, measAvgNum);
    avgM0LABData = getAverageData(M0LABData, measAvgNum);
    avgM2LABData = getAverageData(M2LABData, measAvgNum);
    avgM3LABData = getAverageData(M3LABData, measAvgNum);
    return {
      res: true,
      measData: {
        M0SpectrumData: avgM0SpectrumData,
        M2SpectrumData: avgM2SpectrumData,
        M3SpectrumData: avgM3SpectrumData,
        M0LABData: avgM0LABData,
        M2LABData: avgM2LABData,
        M3LABData: avgM3LABData,
      },
      error: null,
    };
  } catch (error) {
    return {
      res: false,
      measData: {
        reflectanceData: null,
        LABData: null,
      },
      error: error?.message,
    };
  }
};

const getAvgResultIndexKeyMeasurementData = () => {
  try {
    const spectrumData = [];
    const LABData = [];
    let avgSpectrumData = [];
    let avgLABData = [];
    const firstMeasurement = getFilterExactMeasurementData(filterType);
    spectrumData[0] = firstMeasurement.reflectanceData;
    LABData[0] = firstMeasurement.LABData;
    for (let i = 1; i < measAvgNum; i++) {
      const measRes = performMeasurement();
      if (measRes.res) {
        // get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        const measData = getFilterExactMeasurementData(filterType);
        spectrumData[i] = measData.reflectanceData;
        LABData[i] = measData.LABData;
      } else {
        const error = getLastError();

        return {
          res: false,
          measData: {
            reflectanceData: null,
            LABData: null,
          },
          error: error.errorString,
        };
      }
    }

    avgSpectrumData = getAverageData(spectrumData, measAvgNum);
    avgLABData = getAverageData(LABData, measAvgNum);
    return {
      res: true,
      measData: {
        reflectanceData: avgSpectrumData,
        LABData: avgLABData,
      },
      error: null,
    };
  } catch (error) {
    return {
      res: false,
      measData: {
        reflectanceData: null,
        LABData: null,
      },
      error: error?.message,
    };
  }
};

const getExactAvgMeasurementData = () => {
  if (filterType == M0_M2_M3) {
    return getAvgM0M2M3MeasurementData();
  }
  return getAvgResultIndexKeyMeasurementData();
};

module.exports = {
  loadExactLibraryFunctions,
  connectExactDevice,
  waitForExactCalibrationComplete,
  waitForExactMeasurementComplete,
  getExactMeasurementData,
  getExactSerialNumber,
  getBasicExactDeviceInfo,
  setExactDeviceConfiguration,
  disconnectExactDevice,
  checkExactCalibration,
  updateExactStartMeasure,
  getExactMeasureStatus,
  getExactAvgMeasurementData,
};
