const fs = require('fs');
var ffi = require('@lwahonen/ffi-napi');
var path = require('path');
const { dialog } = require('electron');
const {
  checkBaudRateQ,
  setDeviceOnlineQ,
  initializeQ,
  totalResetDeviceWithoutRemoteQ,
  setReflectanceModeQ,
  setParametersQ,
  DStdType,
  whiteBaseType,
  illuminantType,
  obsType,
  setTableReflectanceModeQ,
  moveCloserToWhiteRefPosQ,
} = require('./scanQueries');
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

if (process.platform == 'win32') {
  dllDir = getAssetPath('SDK', 'Ci62', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci62 needs to expose here first
const loadCi62LibraryFunctions = () => {
  try {
    // exposing dll functions to electron
    ci62 = ffi.Library(path.join(dllDir, 'Ci62'), {
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
      title: 'Exposing Ci62 Library Functions',
      message: `Error loading Ci62 library :- ${error} && DLL file exists =>${fs.existsSync(path.join(dllDir, 'Ci62')) ? 'yes' : 'no'} `,
    });
  }
};

const connect = () => ci62.Connect();
const disconnect = () => ci62.Disconnect();
const getAvailableSettings = () => ci62.GetAvailableSettings();
const setOption = (option, value) => ci62.SetOption(option, value);
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
      const value = ci62.GetOption(key, options[key]);
      allOptions[key] = value;
    }
    return { res: true, allOptions, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

//set ci62 device params
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

const createCi62ConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const obsrever = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj['Specular'] = options['Specular'];
  configObj['MeasAverageNum'] = options['MeasAverageNum'];
  configObj['IllumObs'] = illuobsType[`${illumination}/${obsrever}`];
  return configObj;
};

//set ci62 device configuration settings
const setCi62DeviceConfiguration = (obj) => {
  const options = createCi62ConfigurationSettings(obj);
  try {
    for (const key in options) {
      if (key == 'Specular') {
        specularType = options[key] ?? null;
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
const waitForCi62CalibrationComplete = (callback) => {
  // var calProgress = ci62.GetCalProgress();
  // or we can use command for this
  var calProgress = ci62.Execute('CALSTATUS GET');
  var interval = setInterval(() => {
    // calProgress = ci62.GetCalProgress();
    calProgress = ci62.Execute('CALSTATUS GET');
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

// manually perform calibration
const performCalibration = () => {
  try {
    const allSteps = ci62.GetCalSteps().split(';');
    allSteps.forEach((step) => {
      const res = ci62.CalibrateStep(step);
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
      const isSet = ci62.Execute(`DEFAULTTOL SET ${key} ${options[key]}`);
      if (!isSet) {
        throw new Error(`Error setting ${key} - ${options[key]}`);
      }
      const isStore = ci62.Execute(`DEFAULTTOL STORE`);
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
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

//change status of startMeasure
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

// get reflective and LAB data of last measurement
const getCi62MeasurementData = () => {
  let refSpinData = null;
  let refSpexData = null;
  let labSpinData = null;
  let labSpexData = null;
  let reflectanceData = null;
  let LABData = null;
  try {
    if (specularType == 'SPIN') {
      refSpinData = ci62.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
      labSpinData = ci62.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
      reflectanceData = convertFloatValues(refSpinData);
      LABData = convertFloatValues(labSpinData);
    } else if (specularType == 'SPEX') {
      refSpexData = ci62.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
      labSpexData = ci62.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
      reflectanceData = convertFloatValues(refSpexData);
      LABData = convertFloatValues(labSpexData);
    } else if (specularType == 'SPIN_SPEX') {
      refSpinData = ci62.Execute('SAMPLE GET REFL 0 SPIN').split(' ');
      labSpinData = ci62.Execute('SAMPLE GET LAB 0 SPIN').split(' ');
      refSpexData = ci62.Execute('SAMPLE GET REFL 0 SPEX').split(' ');
      labSpexData = ci62.Execute('SAMPLE GET LAB 0 SPEX').split(' ');
      // to reset dataReady status to fail for next measurement wait
      var getSpectralData = ci62.GetSpectralData(0, 0);
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
    var getSpectralData = ci62.GetSpectralData(0, 0);
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
  const errorCode = ci62.GetLastErrorCode();
  const errorString = ci62.GetLastErrorString();
  return { errorCode, errorString };
};

//performs connection to ci62 device
const connectCi62Device = () => {
  try {
    // connection
    if (ci62.IsConnected()) return { res: true, error: null };
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

const disconnectCi62Device = () => {
  try {
    if (!ci62.IsConnected()) return { res: true, error: null };
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

const getBasicCi62DeviceInfo = () => {
  try {
    const serialNumber = ci62.GetSerialNum();
    const interfaceVersion = ci62.GetInterfaceVersion();
    const calStatus = checkCi62Calibration();
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
    const timeout = parseInt(ci62.Execute('PARAM GET CalWhiteTimeout'));
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
    var calStatus = ci62.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const getCalibrationExpireTime = () => {
  var calStatus = ci62.Execute('CALSTATUS GET');
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

// common helper function for delay
const execQuery = (query) => {
  return ci62.Execute(query);
};
const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// wait for initialse commad to complete
const initialiseCmdDelay = () => {
  return sleep(18000);
};

// wait for move commad to complete
const moveCmdDelay = () => {
  return sleep(10000);
};

// wait for other commad to complete
const otherCmdDelay = () => {
  return sleep(6000);
};

const checkScanError = (errAns) => {
  // ErrorAnswer :<D1><80> <ScanErrorType> <CR><LF>
  if (errAns.startsWith(':209')) {
    const scanErrType = errAns.split(' ')[1];
    return { hasError: true, errorType: scanErrType };
  }
  return { hasError: false, errorType: null };
};

//set device online
const setDeviceOnline = () => {
  const setDevOnlineRes = execQuery(setDeviceOnlineQ);
  const error = checkScanError(setDevOnlineRes);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

// check baud rate
const checkBaudRate = () => {
  const baudRateRes = execQuery(checkBaudRateQ);
  const error = checkScanError(baudRateRes);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  const isValidBaudRate = baudRateRes.startsWith('; 209');
  if (isValidBaudRate) {
    return { res: true, error: null };
  }
  return { res: false, error: null };
};

//initialise device
const initialiseDevice = () => {
  const initScanRes = execQuery(initializeQ);
  const error = checkScanError(baudRateRes);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

//Reset the Spectrolino:
const resetDeviceWithoutRemote = () => {
  const res = execQuery(totalResetDeviceWithoutRemoteQ);
  const error = checkScanError(res);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

//Set measurement type
const setReflectanceMode = () => {
  const res = execQuery(setReflectanceModeQ);
  const error = checkScanError(res);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

// Sets the colorimetric parameters
const setParameters = (density, whiteBase, illum, obs) => {
  const res = execQuery(setParametersQ(density, whiteBase, illum, obs));
  const error = checkScanError(res);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

const setTableReflectanceMode = () => {
  const res = execQuery(setTableReflectanceModeQ);
  const error = checkScanError(res);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

const moveToWhiteRefPos = () => {
  const res = execQuery(moveCloserToWhiteRefPosQ);
  const error = checkScanError(res);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

// perform automatic scan
const ci62AutoScan = () => {
  //set Device Online
  const setDevOnline = setDeviceOnline();
  if (!setDevOnline.res) return;

  //check for baud rate
  const hasValidBaudRate = checkBaudRate();
  if (!hasValidBaudRate.res) return;

  //initialise device
  const initDev = initialiseDevice();
  if (!initDev.res) return;

  //reset device
  const resetDevRes = resetDeviceWithoutRemote();
  if (!resetDevRes.res) return;

  //set measurement reflectance type
  const setRefType = setReflectanceMode();
  if (!setRefType.res) return;

  // Set parameters
  const setParamRes = setParameters(
    DStdType.DIN,
    whiteBaseType.Pap,
    illuminantType.IlluminantD65,
    obsType.TwoDeg,
  );
  if (!setParamRes.res) return;

  //perform scan
  //set table reflectance mode
  const setTableRef = setTableReflectanceMode();
  if (!setTableRef.res) return;

  //move to white ref position
  const moveToWhiteRef = moveToWhiteRefPos();
  if (!moveToWhiteRef.res) return;
};

const getSampleData = (index) => {
  const sampleData = {};
  try {
    sampleData['reflectanceData'] = {
      refSpinData: convertFloatValues(
        ci62.Execute(`SAMPLE GET REFL ${index} SPIN`).split(' '),
      ),
      refSpexData: convertFloatValues(
        ci62.Execute(`SAMPLE GET REFL ${index} SPEX`).split(' '),
      ),
    };
    sampleData['LABData'] = {
      labSpinData: convertFloatValues(
        ci62.Execute(`SAMPLE GET LAB ${index} SPIN`).split(' '),
      ),
      labSpexData: convertFloatValues(
        ci62.Execute(`SAMPLE GET LAB ${index} SPEX`).split(' '),
      ),
    };
    if (
      sampleData['reflectanceData'].refSpinData.length == 31 &&
      sampleData['reflectanceData'].refSpexData.length == 31 &&
      sampleData['LABData'].labSpinData.length == 3 &&
      sampleData['LABData'].labSpexData.length == 3
    ) {
      return sampleData;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getTransformName = (index) => {
  if (index == 7) {
    return 'None';
  } else if (index == 8) {
    return execQuery('TRANSFORM GET NAME');
  } else {
    const allTransform = execQuery('TRANSFORM GET NAMES').split(' ');
    if (allTransform.length == index) {
      return allTransform[index];
    }
    return '';
  }
};

const getFileSystemInfo = () => {
  return execQuery('FILE SUMMARIZE');
};

const getSampleInfo = (options, index, geometry) => {
  const sampleInfo = {};
  try {
    options.forEach((key) => {
      if (key == 'NETPROFILERSTATUS') {
        sampleInfo[key] = ci62.GetOption('NetProfiler');
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

// Export Measurement Data
const getCi62AllSamples = () =>
  new Promise(async (resolve) => {
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
      const totalSamples = ci62.GetSampleCount();
      console.log({ totalSamples });
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
            await sleep(100);
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

const getCi62SampleCount = () => ci62.GetSampleCount();

const clearAllCi62Samples = () =>
  new Promise((resolve) => {
    try {
      const sampleCount = getCi62SampleCount();
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
const getCi62SingleSamples = (specularCi62) => {
  return new Promise((resolve) => {
    const processSampleData = async () => {
      try {
        const totalSamples = ci62.GetSampleCount();
        console.log({ totalSamples });

        if (totalSamples > 0) {
          const sampleElement = await getSampleData(0);

          if (sampleElement) {
            let reflectanceData;
            let LABData;

            if (specularCi62 === 'SPIN') {
              reflectanceData = sampleElement.reflectanceData.refSpinData;
              LABData = sampleElement.LABData.labSpinData;
            } else if (specularCi62 === 'SPEX') {
              reflectanceData = sampleElement.reflectanceData.refSpexData;
              LABData = sampleElement.LABData.labSpexData;
            } else if (specularCi62 === 'SPIN_SPEX') {
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
  getCi62SingleSamples,
};
