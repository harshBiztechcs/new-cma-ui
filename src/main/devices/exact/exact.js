const fs = require('fs');
var ffi = require('@lwahonen/ffi-napi');
const { dialog } = require('electron');
var path = require('path');
const { getAssetPath } = require('../../util');
var dllDir = null;
if (process.platform == 'win32') {
  dllDir = getAssetPath('SDK', 'eXact', 'win', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
} else if (process.platform == 'darwin') {
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

//constant
let M0_M2_M3 = 'M0_M2_M3';

const loadExactLibraryFunctions = () => {
  try {
    exact = ffi.Library(path.join(dllDir, 'eXact'), {
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
      GetLastErrorCode: ['int', []],
      GetLastErrorString: ['string', []],
      Execute: ['string', ['string']],
    });
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing Exact Library Functions',
      message: `Error loading Exact library :- ${error} && DLL file exists =>${fs.existsSync(path.join(dllDir, 'eXact')) ? 'yes' : 'no'} `,
    });
  }
};

const connect = () => exact.Connect();
const disconnect = () => exact.Disconnect();
const getAvailableSettings = () => exact.GetAvailableSettings();
const isDataReady = () => exact.IsDataReady();
const setOption = (option, value) => exact.SetOption(option, value);
const setParam = (option, value) =>
  exact.Execute(`PARAM SET ${option} ${value}`);

// get last error info
const getLastError = () => {
  const errorCode = exact.GetLastErrorCode();
  const errorString = exact.GetLastErrorString();
  return { errorCode, errorString };
};

//performs connection to exact device
const connectExactDevice = () => {
  try {
    // connection
    if (exact.IsConnected()) return { res: true, error: null };
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
  var calStatus = exact.Execute('CALSTATUS GET');
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
    var calStatus = exact.Execute('CALSTATUS GET');
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

//set exact device params
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

const createExactConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const obsrever = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj['ResultIndexKey'] = options['ResultIndexKey'];
  configObj['MeasAverageNum'] = options['MeasAverageNum'];
  configObj['IllumObs'] = illuobsType[`${illumination}/${obsrever}`];
  if (options['DensityStatus']) {
    configObj['DENSITYSTATUS'] = options['DensityStatus'];
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
              `Device isn't configured to support M1 measurement. Please configure device for M1 first and try again`
            );
          }
        } else {
          if (res == '1') {
            throw new Error(
              `Device isn't configured to support ${options[key]} measurement. Please configure device for ${options[key]} first and try again`
            );
          }
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

// manually perform calibration
const performCalibration = () => {
  try {
    const allSteps = exact.GetCalSteps().split(';');

    allSteps.forEach((step) => {
      const res = exact.CalibrateStep(step);

      if (!res) {
        throw new Error(`Calibration failed for ${step}`);
      }
    });
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

// common helper function to wait for calibration to complete,
// passed callback function will be called after calibration done
const waitForExactCalibrationComplete = (callback) => {
  // var calProgress = exact.GetCalProgress();
  // or we can use command for this
  var calProgress = exact.Execute('CALSTATUS GET');

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
      `error log before measurement ${exact.Execute('ERRORLOG GET')}`
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

//change status of startMeasure
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
    let M0SpectrumData = [];
    let M2SpectrumData = [];
    let M3SpectrumData = [];
    let M0LABData = [];
    let M2LABData = [];
    let M3LABData = [];
    let avgM0SpectrumData = [];
    let avgM2SpectrumData = [];
    let avgM3SpectrumData = [];
    let avgM0LABData = [];
    let avgM2LABData = [];
    let avgM3LABData = [];
    let spectrumData = [];
    let LABData = [];
    let avgSpectrumData = [];
    let avgLABData = [];
    let M0FirstMeasData = getFilterExactMeasurementData('M0');
    let M2FirstMeasData = getFilterExactMeasurementData('M2');
    let M3FirstMeasData = getFilterExactMeasurementData('M3');
    M0SpectrumData[0] = M0FirstMeasData.reflectanceData;
    M2SpectrumData[0] = M2FirstMeasData.reflectanceData;
    M3SpectrumData[0] = M3FirstMeasData.reflectanceData;
    M0LABData[0] = M0FirstMeasData.LABData;
    M2LABData[0] = M2FirstMeasData.LABData;
    M3LABData[0] = M3FirstMeasData.LABData;
    for (let i = 1; i < measAvgNum; i++) {
      const measRes = performMeasurement();
      if (measRes.res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
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
        var error = getLastError();

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
    let spectrumData = [];
    let LABData = [];
    let avgSpectrumData = [];
    let avgLABData = [];
    let firstMeasurement = getFilterExactMeasurementData(filterType);
    spectrumData[0] = firstMeasurement.reflectanceData;
    LABData[0] = firstMeasurement.LABData;
    for (let i = 1; i < measAvgNum; i++) {
      const measRes = performMeasurement();
      if (measRes.res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        const measData = getFilterExactMeasurementData(filterType);
        spectrumData[i] = measData.reflectanceData;
        LABData[i] = measData.LABData;
      } else {
        var error = getLastError();

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

const demo = () => {
  try {
    loadExactLibraryFunctions();
    var interfaceVersion = exact.GetInterfaceVersion();
    console.log({ interfaceVersion });
    var allAvailableSettings = getAvailableSettings();
    console.log({ allAvailableSettings: allAvailableSettings });
    allAvailableSettings.split(';').forEach((setting) => {
      console.log(setting + ' ' + exact.GetSettingOptions(setting));
      console.log('default value ' + ' - ' + exact.GetOption(setting));
    });

    console.log({ calibrationSteps: exact.GetCalSteps() });

    //test usb
    console.log(exact.GetOption('Connection_Method'));
    const setUSB = exact.SetOption('Connection_Method', 'USB');
    console.log({ setUSB });
    console.log(exact.GetOption('Connection_Method'));
    console.log({ calStatus: exact.Execute('CALSTATUS GET') });

    //test bluetooth
    // console.log({ config : exact.Execute("BLUETOOTH CONFIG ALWAYSON") });
    // console.log({ add : exact.Execute("BLUETOOTH GET ADDR")});
    // const setBluetooh = exact.SetOption("Connection_Method", "eXact_014387");
    // console.log({ config : exact.Execute("BLUETOOTH CONFIG ALWAYSON") });
    // console.log({ add : exact.Execute("BLUETOOTH GET ADDR")});
    // console.log({ setBluetooh });
    // console.log(exact.GetOption("Connection_Method"));
    console.log({ calStatus: exact.Execute('CALSTATUS GET') });
    console.log({ isConnected: exact.IsConnected() });
    const connRes = connectExactDevice();
    console.log({ connRes });
    //console.log({ disconnect : exact.Disconnect() })
    console.log({ isConnected: exact.IsConnected() });
    if (!connRes.res) return;
    //info
    console.log({ calibrationStandard: exact.GetCalibrationStandard() });
    console.log({ serialNumber: exact.GetSerialNum() });
    console.log({ calstatus: exact.GetCalStatus() });
    console.log({ spectralCount: exact.GetSpectralSetCount() });
    for (let index = 0; index < exact.GetSpectralSetCount(); index++) {
      console.log('spectralSetCount ' + exact.GetSpectralSetName(index));
    }
    console.log({ calStatus: exact.Execute('CALSTATUS GET') });
    console.log({ aperture: exact.Execute('INSTRUMENT GET APERTURE') });
    console.log({ isM0M1Compliant: exact.Execute('IsM0M1Compliant') });
    console.log({ lastMeasurement: exact.Execute('SAMPLE GET LAB 0 M1') });
    console.log({ lastMeasurement: exact.Execute('SAMPLE GET REFL 0 M1') });
    console.log({ model: exact.Execute('SERIALNUM GET MODEL') });
    console.log({ IsDataReady: isDataReady() });

    // console.log(" illuobs get " + exact.Execute("PARAM GET ILLUMOBS"));
    // console.log(" illuobs set " + exact.Execute("PARAM SET ILLUMOBS 5")); //working ?
    //  console.log(" colorspace get " + exact.Execute("PARAM GET COLORSPACE"));
    //  console.log(" colorspace set " + exact.Execute("PARAM SET COLORSPACE 2")); //working ?
    //console.log({ default : exact.Execute("PARAM DEFAULT all")});
    console.log(' illuobs get ' + exact.Execute('PARAM GET ILLUMOBS'));
    if (exact.GetCalStatus() == 1) {
      console.log({ calibrationSteps: exact.GetCalSteps() });
      const calres = performCalibration();
      if (!calres.res) return;
    }
    console.log({ calstatus: exact.GetCalStatus() });
    waitForExactCalibrationComplete(() => {
      console.log('calibration completer');
      const calResult = getExactWhiteCalibrationResult();
      console.log({ calResult });
      // console.log(" illuobs set " + exact.Execute("PARAM SET ILLUMOBS 4")); //“D50/2” //4
      //console.log(" illuobs get " + exact.Execute("PARAM GET ILLUMOBS"));
      const meanRes = performMeasurement();
      console.log({ meanRes });
      if (!meanRes.res) return;
      const meanData = getExactMeasurementData();
      console.log({ meanData });
      console.log('updating measurement settings.....');
      //  console.log(" illuobs set " + exact.Execute("PARAM SET ILLUMOBS 7")); //“D65/10” //7
      //  console.log(" illuobs get " + exact.Execute("PARAM GET ILLUMOBS"));
      console.log(' colorspace get ' + exact.Execute('PARAM GET COLORSPACE'));
      console.log(' colorspace set ' + exact.Execute('PARAM SET COLORSPACE 2')); //working ?
      const meanResD65 = performMeasurement();
      console.log({ meanResD65 });
      const meanDataD65 = getExactMeasurementData();
      console.log({ meanDataD65 });
      // waitForExactMeasurementComplete(() => {
      //   const meanData = getExactMeasurementData();
      //   console.log({ meanData });
      // });
    });
  } catch (error) {
    console.log({ error });
  }
};
//demo();
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
