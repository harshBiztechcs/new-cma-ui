const koffi = require('koffi');
const path = require('path');
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

if (process.platform === 'win32') {
  dllDir = getAssetPath('SDK', 'Ci62', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci62 needs to expose here first
const loadCi62LibraryFunctions = () => {
  try {
    // exposing dll functions to electron
    ci62 = koffi.load(path.join(dllDir, 'Ci62'));

    if (!ci62) {
      throw new Error('Failed to load Ci62 DLL');
    }

    // Expose DLL functions to Electron
    ci62.GetInterfaceVersion = ci62.stdcall(
      'GetInterfaceVersion',
      'string',
      [],
    );
    ci62.Connect = ci62.stdcall('Connect', 'bool', []);
    ci62.Disconnect = ci62.stdcall('Disconnect', 'bool', []);
    ci62.IsConnected = ci62.stdcall('IsConnected', 'bool', []);
    ci62.GetCalibrationStandard = ci62.stdcall(
      'GetCalibrationStandard',
      'string',
      [],
    );
    ci62.GetSerialNum = ci62.stdcall('GetSerialNum', 'string', []);
    ci62.GetSpectralSetCount = ci62.stdcall('GetSpectralSetCount', 'int', []);
    ci62.GetSpectralSetName = ci62.stdcall('GetSpectralSetName', 'string', [
      'int',
    ]);
    ci62.GetWavelengthCount = ci62.stdcall('GetWavelengthCount', 'int', []);
    ci62.GetWavelengthValue = ci62.stdcall('GetWavelengthValue', 'int', [
      'int',
    ]);
    ci62.Measure = ci62.stdcall('Measure', 'bool', []);
    ci62.IsDataReady = ci62.stdcall('IsDataReady', 'bool', []);
    ci62.GetSpectralData = ci62.stdcall('GetSpectralData', 'float', [
      'int',
      'int',
    ]);
    ci62.GetCalStatus = ci62.stdcall('GetCalStatus', 'int', []);
    ci62.GetCalSteps = ci62.stdcall('GetCalSteps', 'string', []);
    ci62.CalibrateStep = ci62.stdcall('CalibrateStep', 'bool', ['string']);
    ci62.GetCalMode = ci62.stdcall('GetCalMode', 'string', []);
    ci62.GetCalProgress = ci62.stdcall('GetCalProgress', 'int', []);
    ci62.AbortCalibration = ci62.stdcall('AbortCalibration', 'bool', []);
    ci62.ClearSamples = ci62.stdcall('ClearSamples', 'bool', []);
    ci62.GetSampleCount = ci62.stdcall('GetSampleCount', 'int', []);
    ci62.GetSampleData = ci62.stdcall('GetSampleData', 'float', ['int', 'int']);
    ci62.SetCurrentSample = ci62.stdcall('SetCurrentSample', 'bool', ['int']);
    ci62.GetAvailableSettings = ci62.stdcall(
      'GetAvailableSettings',
      'string',
      [],
    );
    ci62.GetSettingOptions = ci62.stdcall('GetSettingOptions', 'string', [
      'string',
    ]);
    ci62.GetOption = ci62.stdcall('GetOption', 'string', ['string']);
    ci62.SetOption = ci62.stdcall('SetOption', 'bool', ['string', 'string']);
    ci62.ScanIsSupported = ci62.stdcall('ScanIsSupported', 'bool', []);
    ci62.GetLastErrorCode = ci62.stdcall('GetLastErrorCode', 'int', []);
    ci62.GetLastErrorString = ci62.stdcall('GetLastErrorString', 'string', []);
    ci62.Execute = ci62.stdcall('Execute', 'string', ['string']);

    return ci62;
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing Ci62 Library Functions',
      message: `Error loading Ci62 library: ${error.message}`,
    });
    return null; // Return null in case of an error
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

// get general settings
const getAllOptions = (options) => {
  try {
    const allOptions = {};

    Object.keys(options).forEach((key) => {
      const value = ci62.GetOption(key, options[key]);
      allOptions[key] = value;
    });

    return { res: true, allOptions, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
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
  let calProgress = ci62.Execute('CALSTATUS GET');
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
    const calStatus = ci62.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const getCalibrationExpireTime = () => {
  const calStatus = ci62.Execute('CALSTATUS GET');
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

// set device online
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

// initialise device
const initialiseDevice = () => {
  const initScanRes = execQuery(initializeQ);
  const error = checkScanError(baudRateRes);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

// Reset the Spectrolino:
const resetDeviceWithoutRemote = () => {
  const res = execQuery(totalResetDeviceWithoutRemoteQ);
  const error = checkScanError(res);
  if (error.hasError) {
    return { res: false, error: error.errorType };
  }
  return { res: true, error: null };
};

// Set measurement type
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
  // set Device Online
  const setDevOnline = setDeviceOnline();
  if (!setDevOnline.res) return;

  // check for baud rate
  const hasValidBaudRate = checkBaudRate();
  if (!hasValidBaudRate.res) return;

  // initialise device
  const initDev = initialiseDevice();
  if (!initDev.res) return;

  // reset device
  const resetDevRes = resetDeviceWithoutRemote();
  if (!resetDevRes.res) return;

  // set measurement reflectance type
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

  // perform scan
  // set table reflectance mode
  const setTableRef = setTableReflectanceMode();
  if (!setTableRef.res) return;

  // move to white ref position
  const moveToWhiteRef = moveToWhiteRefPos();
  if (!moveToWhiteRef.res) return;
};

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

const testCi62 = () => {
  try {
    loadCi62LibraryFunctions();
    const isDisconnected = ci62.Disconnect();
    console.log({ isDisconnected });
    console.log(`isConnected ${ci62.IsConnected()}`);
    const interfaceVersion = ci62.GetInterfaceVersion();
    console.log({ interfaceVersion });
    const allAvailabelSettings = getAvailableSettings();
    console.log({ allAvailabelSettings });

    console.log(
      `trigger option button  ${ci62.SetOption('Reading_Mode', 'Button')}`,
    );

    allAvailabelSettings.split(';').forEach((setting) => {
      console.log(`${setting} ${ci62.GetSettingOptions(setting)}`);
      console.log(`default value ` + ` - ${ci62.GetOption(setting)}`);
    });

    console.log({
      setMeasurementMode: ci62.SetOption('Measurement_Mode', 'Tungsten'),
      setMeasurementMode1: ci62.SetOption('Measurement_Mode', 'UV_D65'),
      setMeasurementMode2: ci62.SetOption('Measurement_Mode', 'UV_ADJ1'),
      setMeasurementMode3: ci62.SetOption('Measurement_Mode', 'UV_ADJ2'),
    });
    console.log({
      measurementMode: ci62.GetSettingOptions('Measurement_Mode'),
    });
    console.log(`default value ` + ` - ${ci62.GetOption('Measurement_Mode')}`);

    // connection
    const isConnect = connect();
    if (!isConnect) {
      console.log('error connecting');
      const error = getLastError();
      console.log(error);
      return;
    }
    console.log(`isConnected ${ci62.IsConnected()}`);
    console.log(
      `trigger option button  ${ci62.SetOption('Reading_Mode', 'Pressure')}`,
    );
    console.log(`volume get ${ci62.Execute('PARAM GET VolumeLevel')}`);
    console.log(`volume set ${ci62.Execute('PARAM SET VolumeLevel 1')}`); // working
    console.log(`volume get ${ci62.Execute('PARAM GET VolumeLevel')}`);
    console.log('perform calibration !!!');
    console.log(` calMode ${ci62.GetCalMode()}`);
    console.log(` timeout ${ci62.Execute('PARAM GET CalWhiteTimeout')}`);
    // PARAM SET CalWhiteTimeout 8
    console.log(` timeout set ${ci62.Execute('PARAM SET CalWhiteTimeout 0')}`);
    console.log(` illuobs get ${ci62.Execute('PARAM GET ILLUMOBS')}`);
    console.log(` illuobs set ${ci62.Execute('PARAM SET ILLUMOBS 5')}`); // working
    console.log(` illuobs set ${ci62.Execute('PARAM SET COLORSPACE 2')}`); // working
    console.log(
      ` standard set tolerance illu ${ci62.Execute(
        'STANDARD SET TOLERANCE ILLUMOBS 1 D65_10',
      )}`,
    );
    console.log(
      `defaulttol - ${ci62.Execute('DEFAULTTOL SET ILLUMOBS D65/10')}`,
    );
    console.log(`store ${ci62.Execute('DefaultTol Store')}`);
    console.log(`calibration standard ${ci62.GetCalibrationStandard()}`);
    console.log(`calibration steps ${ci62.GetCalSteps()}`);
    console.log(`calStatus ${ci62.Execute('CALSTATUS GET')}`);
    console.log(` opacity ${ci62.Execute('SAMPLE GET OPACITY')} `);
    console.log(` opacityType ${ci62.Execute('SAMPLE GET OPACITYTYPE')} `); // overblack
    console.log(
      ` opacityIllumobs ${ci62.Execute('SAMPLE GET OPACITYILLUMOBS')} `,
    );
    console.log(` opacityCoeff ${ci62.Execute('OPACITY GET')}`);
    console.log(
      ` opacitySet ${ci62.Execute('OPACITY SET 0.0400 0.0000 0.6000 0.6000')}`,
    ); // set opacity coeff
    console.log(` opacityCoeff ${ci62.Execute('OPACITY GET')}`);
    // setInterval(() => {
    //   console.log("checking calibration status");
    //   console.log('CalProgress - '+ ci62.GetCalProgress());
    //   console.log('CalStatus GET - '+ ci62.Execute('CALSTATUS GET'));
    // }, 500);
    // var getResult = GetSpectralData
    // var calres = performCalibration();
    console.log({ calres });
    waitForCi62CalibrationComplete(() => {
      console.log('getting white cal value');
      const whiteCalValue = getCi62WhiteCalibrationResult();
      console.log({ whiteCalValue });
      // var result = setDefaultTolarence({ COLORSPACE : "LAB" });
      const result = setDefaultTolarence({
        COLORSPACE: 'LAB',
        ILLUMOBS: 'D50/10',
      });
      const setModel = ci62.Execute('MODELCONFIG ADD ALLOWEDILLUMOBS D65/10');
      console.log({ setModel });
      // var result = setDefaultTolarence({ COLORSPACE : "LAB", ILLUMOBS : "D65/10" });
      if (!result.res) {
        console.log(`error settingDefaultTolarence ${res}`);
        return;
      }
      console.log(
        `modeconfig res - ${ci62.Execute(
          'MODELCONFIG GET ALLOWEDCOLORSPACES',
        )}`,
      );
      console.log(
        `modeconfig res - ${ci62.Execute('MODELCONFIG GET ALLOWEDILLUMOBS')}`,
      );

      console.log(`measurement status - ${isDataReady()}`);
      console.log('perform measurement !!');
      const measureRes = performMeasurement();
      console.log({ measureRes });
      waitForCi62MeasurementComplete(() => {
        console.log('getting measurement data');
        const measurementData = getCi62MeasurementData();
        console.log({ measurementData });
        console.log(`after getting data measurement status - ${isDataReady()}`);
        const getSpectralData = ci62.GetSpectralData(0, 0);
        console.log({ getSpectralData });
        console.log(
          `after getting Spectraldata measurement status - ${isDataReady()}`,
        );
      });
    });
  } catch (error) {
    console.log(error);
  }
};

const testSampleInfo = () => {
  loadCi62LibraryFunctions();
  const isConnect = connect();
  if (!isConnect) {
    console.log('error connecting');
    const error = getLastError();
    console.log(error);
    return;
  }

  console.log(ci62.GetOption('NetProfiler'));
  console.log(execQuery('TRANSFORM GET NAMES'));
  console.log(execQuery('TRANSFORM GET NAME'));

  const totalSamples = ci62.GetSampleCount();
  console.log({ totalSamples });

  const element = getSampleData(index);
  console.log({ element });

  const fileInfo = getFileSystemInfo();
  console.log({ fileInfo });
};

// testCi62();
// testSampleInfo();
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
