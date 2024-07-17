const fs = require('fs');
var ffi = require('@lwahonen/ffi-napi');
const { dialog } = require('electron');
var path = require('path');
const { getAssetPath } = require('../../util');
var dllDir = null;
if (process.platform == 'win32') {
  dllDir = getAssetPath('SDK', 'eXact2', 'win', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
} else if (process.platform == 'darwin') {
  dllDir = getAssetPath('SDK', 'eXact2', 'mac', 'x86_64');
}

let exact2 = null;
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

//constant
let M0_M1_M2_M3 = 'M0_M1_M2_M3';

const loadExact2LibraryFunctions = () => {
  try {
    exact2 = ffi.Library(path.join(dllDir, 'eXact2'), {
      GetInterfaceVersion: ['string', []],
      Connect: ['bool', []],
      Disconnect: ['bool', []],
      IsConnected: ['bool', []],
      GetCalibrationStandard: ['string', []],
      GetSerialNum: ['string', []],
      GetSpectralSetCount: ['int', []],
      GetSpectralSetName: ['string', ['int']],
      GetWavelengthCount: ['int', []],
      GetWavelengthValue: ['int', ['int']],
      Measure: ['bool', []],
      IsDataReady: ['bool', []],
      GetSpectralData: ['float', ['int', 'int']],
      GetCalStatus: ['int', []],
      GetCalSteps: ['string', []],
      CalibrateStep: ['bool', ['string']],
      GetCalMode: ['string', []],
      GetCalProgress: ['int', []],
      AbortCalibration: ['bool', []],
      ClearSamples: ['bool', []],
      GetSampleCount: ['int', []],
      GetSampleData: ['float', ['int', 'int']],
      SetCurrentSample: ['bool', ['int']],
      GetAvailableSettings: ['string', []],
      GetSettingOptions: ['string', ['string']],
      GetOption: ['string', ['string']],
      SetOption: ['bool', ['string', 'string']],
      ScanIsSupported: ['bool', []],
      ScanConfig: ['bool', ['int', 'float']],
      ScanStart: ['bool', []],
      ScanGetStatus: ['int', []],
      ScanGetCount: ['int', []],
      ScanGetData: ['string', ['int', 'int']],
      GetLastErrorCode: ['int', []],
      GetLastErrorString: ['string', []],
      Execute: ['string', ['string']],
    });
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing Exact2 Library Functions',
      message: `Error loading Exact2 library :- ${error} && DLL file exists =>${fs.existsSync(path.join(dllDir, 'eXact2')) ? 'yes' : 'no'} `,
    });
  }
};

const connect = () => exact2.Connect();
const disconnect = () => exact2.Disconnect();
const isDataReady = () => exact2.IsDataReady();
const setOption = (option, value) => exact2.SetOption(option, value);
const setParam = (option, value) =>
  exact2.Execute(`PARAM SET ${option} ${value}`);

const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// get last error info
const getLastError = () => {
  const errorCode = exact2.GetLastErrorCode();
  const errorString = exact2.GetLastErrorString();
  return { errorCode, errorString };
};

//performs connection to exact2 device
const connectExact2Device = () => {
  try {
    // connection
    if (exact2.IsConnected()) return { res: true, error: null };
    var isConnect = connect();
    if (!isConnect) {
      var error = getLastError();

      return { res: false, error: error.errorString };
    }

    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// get serial number of exact2 device
const getExact2SerialNumber = () => {
  try {
    return exact2.GetSerialNum();
  } catch (error) {
    return null;
  }
};

// get basic info of exact2 device
const getBasicExact2DeviceInfo = () => {
  try {
    const serialNumber = exact2.GetSerialNum();
    const interfaceVersion = exact2.GetInterfaceVersion();
    const calStatus = checkExact2Calibration();
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
    const timeout = parseInt(exact2.Execute('PARAM GET CalWhiteTimeout'));
    if (timeout) {
      return timeout * 3600 - getCalibrationExpireTime();
    }
    return 0;
  } catch (error) {
    return 0;
  }
};

const getCalibrationExpireTime = () => {
  var calStatus = exact2.Execute('cal query status');
  if (calStatus.includes('OK')) {
    try {
      const expireIn = calStatus.split(' ')[3];
      return parseInt(expireIn) * 60;
    } catch (error) {
      return 0;
    }
  }
  return 0;
};

const checkExact2Calibration = () => {
  try {
    var calStatus = exact.Execute('cal query status');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const disconnectExact2Device = () => {
  try {
    // connection
    if (!exact2.IsConnected()) return { res: true, error: null };
    var isDisconnected = disconnect();
    if (!isDisconnected) {
      var error = getLastError();

      return { res: false, error: error.errorString };
    }

    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

//set exact2 device params
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

const createExact2ConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const obsrever = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj['ResultIndexKey'] = options['ResultIndexKey'];
  configObj['MeasAverageNum'] = options['MeasAverageNum'];
  // Skip the Illumination & Observer Setting for exact2 device because in the exact2 documentation there is no command mention for set via code.
  // configObj['IllumObs'] = illuobsType[`${illumination}/${obsrever}`];
  if (options['DensityStatus']) {
    configObj['DENSITYSTATUS'] = options['DensityStatus'];
  }
  return configObj;
};

// set exact2 device configuration
const setExact2DeviceConfiguration = (obj) => {
  const options = createExact2ConfigurationSettings(obj);
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

// set exact2 Strip Mode device configuration
const setExact2DeviceConfigurationStripMode = (obj) => {
  const options = createExact2ConfigurationSettings(obj);
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
        filterType = options[key];
        continue;
      }

      const isSet = setParam(key, options[key]);
      if (!(isSet == '<00>')) {
        throw new Error(`Error setting ${key} - ${options[key]}`);
      }
    }

    const ScanIsSupported = exact2.ScanIsSupported();
    console.log({ ScanIsSupported });

    if (!ScanIsSupported) {
      var error = getLastError();
      console.log(`Scanning is not supported to this device: ${error.errorString}`);
      throw new Error(`Scanning is not supported to this device: ${error.errorString}`);
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// manually perform calibration
const performCalibration = () => {
  try {
    const allSteps = exact2.GetCalSteps().split(';');

    allSteps.forEach((step) => {
      const res = exact2.CalibrateStep(step);

      if (!res) {
        throw new Error(`Calibration failed for ${step}`);
      }
    });
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// manually perform measurement
const performMeasurement = () => {
  try {
    console.log(
      `error log before measurement ${exact2.Execute('ERRORLOG GET')}`
    );
    const res = exact2.Measure();

    if (!res) {
      return { res: false, error: getLastError() };
    }
    return { res: true };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// Get spectral value by Index key
const getIndexKeyMeasurementDataStripMode = (patchNo, mode) => {
  try {
      let reflectanceData = exact2.ScanGetData(patchNo, mode); // M0, M1, M2, M3
      //   console.log({ ScanGetData });
      reflectanceData = convertFloatValues(reflectanceData.trim().split(' '));
      // console.log({ reflectanceData });
      if (reflectanceData) {
          return { res: true, reflectanceData, error: null };
      }
      return { res: false, reflectanceData: null, error: error.message };
  } catch (error) {
      return { res: false, reflectanceData: null, error: error.message };
  }
};

//change status of startMeasure
const updateExact2StartMeasure = (value) => {
  startMeasure = value;
};

const getExact2MeasureStatus = () => {
  return startMeasure;
};

// wait for measurement to complete
const waitForExact2MeasurementComplete = (callback) => {
  try {
    // flush last data ready status
    exact2.GetSpectralData(0, 0);

    startMeasure = true;

    var isReady = isDataReady();
    clearInterval(measureInterval);
    measureInterval = setInterval(() => {
      //check if startMeasure is still true or clear interval
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

//common function to get average of data array
const getAverageData = (data, averageOf) => {
  let avgData = [];
  for (let i = 0; i < data[0].length; i++) {
    avgData[i] = 0;
    for (let j = 0; j < averageOf; j++) {
      avgData[i] = avgData[i] + data[j][i];
    }
    avgData[i] = avgData[i] / averageOf;
  }
  return avgData;
};

const getFilterExact2MeasurementData = (filterType) => {
  try {
    let reflectanceData = exact2.Execute(`Meas get refls ${filterType}`);
    // let LABData = exact2.Execute(`SAMPLE GET LAB 0 ${filterType}`);
    reflectanceData = convertFloatValues(reflectanceData.split(' '));
    // LABData = convertFloatValues(LABData.split(' '));
    // to reset dataReady status to fail for next measurement wait
    exact2.GetSpectralData(0, 0);
    return {
      res: true,
      reflectanceData,
    };
  } catch (error) {
    filterType = 'M0';
    return { res: false, error: error?.message };
  }
};

const getAvgM0M1M2M3MeasurementData = () => {
  try {
    let M0SpectrumData = [];
    let M1SpectrumData = [];
    let M2SpectrumData = [];
    let M3SpectrumData = [];
    let avgM0SpectrumData = [];
    let avgM1SpectrumData = [];
    let avgM2SpectrumData = [];
    let avgM3SpectrumData = [];
    let spectrumData = [];
    let avgSpectrumData = [];
    let M0FirstMeasData = getFilterExact2MeasurementData('M0');
    let M1FirstMeasData = getFilterExact2MeasurementData('M1');
    let M2FirstMeasData = getFilterExact2MeasurementData('M2');
    let M3FirstMeasData = getFilterExact2MeasurementData('M3');
    M0SpectrumData[0] = M0FirstMeasData.reflectanceData;
    M1SpectrumData[0] = M1FirstMeasData.reflectanceData;
    M2SpectrumData[0] = M2FirstMeasData.reflectanceData;
    M3SpectrumData[0] = M3FirstMeasData.reflectanceData;
    for (let i = 1; i < measAvgNum; i++) {
      const measRes = performMeasurement();
      if (measRes.res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        const M0MeasData = getFilterExact2MeasurementData('M0');
        const M1MeasData = getFilterExact2MeasurementData('M1');
        const M2MeasData = getFilterExact2MeasurementData('M2');
        const M3MeasData = getFilterExact2MeasurementData('M3');
        M0SpectrumData[i] = M0MeasData.reflectanceData;
        M1SpectrumData[i] = M1MeasData.reflectanceData;
        M2SpectrumData[i] = M2MeasData.reflectanceData;
        M3SpectrumData[i] = M3MeasData.reflectanceData;
      } else {
        var error = getLastError();

        return {
          res: false,
          measData: {
            reflectanceData: null,
          },
          error: error.errorString,
        };
      }
    }

    avgM0SpectrumData = getAverageData(M0SpectrumData, measAvgNum);
    avgM1SpectrumData = getAverageData(M1SpectrumData, measAvgNum);
    avgM2SpectrumData = getAverageData(M2SpectrumData, measAvgNum);
    avgM3SpectrumData = getAverageData(M3SpectrumData, measAvgNum);
    return {
      res: true,
      measData: {
        M0SpectrumData: avgM0SpectrumData,
        M1SpectrumData: avgM1SpectrumData,
        M2SpectrumData: avgM2SpectrumData,
        M3SpectrumData: avgM3SpectrumData,
      },
      error: null,
    };
  } catch (error) {
    return {
      res: false,
      measData: {
        reflectanceData: null,
      },
      error: error?.message,
    };
  }
};

const getAvgResultIndexKeyMeasurementData = () => {
  try {
    let spectrumData = [];
    let avgSpectrumData = [];
    let firstMeasurement = getFilterExact2MeasurementData(filterType);
    spectrumData[0] = firstMeasurement.reflectanceData;
    for (let i = 1; i < measAvgNum; i++) {
      const measRes = performMeasurement();
      if (measRes.res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        const measData = getFilterExact2MeasurementData(filterType);
        spectrumData[i] = measData.reflectanceData;
      } else {
        var error = getLastError();

        return {
          res: false,
          measData: {
            reflectanceData: null,
          },
          error: error.errorString,
        };
      }
    }

    avgSpectrumData = getAverageData(spectrumData, measAvgNum);
    return {
      res: true,
      measData: {
        reflectanceData: avgSpectrumData,
      },
      error: null,
    };
  } catch (error) {
    return {
      res: false,
      measData: {
        reflectanceData: null,
      },
      error: error?.message,
    };
  }
};

const waitForScanStatus = async (callback) => {
  try {
    // flush last data ready status
    exact2.GetSpectralData(0, 0);

    startMeasure = true;
    let scanCompleted = false;

    //check if startMeasure is still true or clear interval
    if (!startMeasure) {
        clearInterval(measureInterval);
        const resMsg = {
            res: false,
            error: 'Measurement Failed : Device Disconnected !!',
        };
        callback(resMsg);
        return;
    }

    do {
        await sleep(1000 * 3);
        const ScanGetStatus = exact2.ScanGetStatus();
        if (ScanGetStatus == 3) {
            console.log('Scan is completed');
            scanCompleted = true;
        }
        console.log({ ScanGetStatus });
    } while (!scanCompleted);

    if (scanCompleted) {
        startMeasure = false;
        const resMsg = {
            res: true,
            error: null,
        };
        callback(resMsg);
        return;
    }
  } catch (error) {
    startMeasure = false;
    clearInterval(measureInterval);
    const resMsg = {
      res: false,
      error: 'Measurement Failed',
    };
    callback(resMsg);
  }
}

const waitForScanStatusPromise = () =>
  new Promise((resolve) => waitForScanStatus((res) => resolve(res)));

const getAvgM0M1M2M3MeasurementDataStripMode = async (numOfPatches, patchWidth) => {
  try {
    let M0SpectrumData = [];
    let M1SpectrumData = [];
    let M2SpectrumData = [];
    let M3SpectrumData = [];
    let M0SpectrumDataObj = {};
    let M1SpectrumDataObj = {};
    let M2SpectrumDataObj = {};
    let M3SpectrumDataObj = {};

    const ScanConfig = exact2.ScanConfig(numOfPatches, patchWidth);
    console.log({ ScanConfig });

    if (!ScanConfig) {
      var error = getLastError();
      console.log(`Error while setting the configuration: ${error.errorString}`);
      throw new Error(`Error while setting the configuration: ${error.errorString}`);
    }

    // Tells the library to place instruments into scanning mode.
    const ScanStart = exact2.ScanStart();
    console.log({ ScanStart });

    if (!ScanStart) {
      var error = getLastError();
      console.log(`Error while initiating the scanning mode: ${error.errorString}`);
      throw new Error(`Error while initiating the scanning mode: ${error.errorString}`);
    }

    const scanStatusRes = await waitForScanStatusPromise();
    console.log({ scanStatusRes });

    //   do {
    //     await sleep(1000 * 5);
    //     const ScanGetStatus = exact2.ScanGetStatus();
    //     if (ScanGetStatus == 3) {
    //         console.log('Scan is completed');
    //         scanCompleted = true;
    //     }
    //     console.log({ ScanGetStatus });
    // } while (!scanCompleted);

    if (scanStatusRes.res) {
      const ScanGetCount = exact2.ScanGetCount();
      console.log({ ScanGetCount });

      if (ScanGetCount != numOfPatches) {
        var error = getLastError();
        console.log(`Samples are not same in device which you scan. Please try again: ${error.errorString}`);
        throw new Error(`Samples are not same in device which you scan. Please try again: ${error.errorString}`);
      }

      for (let i = 0; i < ScanGetCount; i++) {
        console.log('Inside the for loop', i);
        const M0MeasData = getIndexKeyMeasurementDataStripMode(i, 0);
        const M1MeasData = getIndexKeyMeasurementDataStripMode(i, 1);
        const M2MeasData = getIndexKeyMeasurementDataStripMode(i, 2);
        const M3MeasData = getIndexKeyMeasurementDataStripMode(i, 3);
        M0SpectrumData.push(M0MeasData.reflectanceData);
        M1SpectrumData.push(M1MeasData.reflectanceData);
        M2SpectrumData.push(M2MeasData.reflectanceData);
        M3SpectrumData.push(M3MeasData.reflectanceData);
      }

      for (let j = 0; j < ScanGetCount; j++) {
        M0SpectrumDataObj[j.toString()] = M0SpectrumData[j];
        M1SpectrumDataObj[j.toString()] = M1SpectrumData[j];
        M2SpectrumDataObj[j.toString()] = M2SpectrumData[j];
        M3SpectrumDataObj[j.toString()] = M3SpectrumData[j];
      }

      return {
        res: true,
        measData: {
          M0SpectrumData: M0SpectrumDataObj,
          M1SpectrumData: M1SpectrumDataObj,
          M2SpectrumData: M2SpectrumDataObj,
          M3SpectrumData: M3SpectrumDataObj,
        }
      }

    } else {
      return { res: false, error: { message: scanStatusRes.error } };
    }
  } catch (error) {
    return {
      res: false,
      measData: {
        reflectanceData: null,
      },
      error: error?.message,
    };
  }
}

const getExact2AvgMeasurementData = () => {
  if (filterType == M0_M1_M2_M3) {
    return getAvgM0M1M2M3MeasurementData();
  }
  return getAvgResultIndexKeyMeasurementData();
};

const getExact2AvgMeasurementDataStripMode = async (numOfPatches,patchWidth) => {
  if (filterType == M0_M1_M2_M3) {
    return await getAvgM0M1M2M3MeasurementDataStripMode(numOfPatches,patchWidth);
  }
  return getAvgResultIndexKeyMeasurementData(numOfPatches,patchWidth);
};


module.exports = {
  loadExact2LibraryFunctions,
  connectExact2Device,
  waitForExact2MeasurementComplete,
  getExact2SerialNumber,
  getBasicExact2DeviceInfo,
  setExact2DeviceConfiguration,
  disconnectExact2Device,
  checkExact2Calibration,
  updateExact2StartMeasure,
  getExact2MeasureStatus,
  getExact2AvgMeasurementData,
  setExact2DeviceConfigurationStripMode,
  getExact2AvgMeasurementDataStripMode
};
