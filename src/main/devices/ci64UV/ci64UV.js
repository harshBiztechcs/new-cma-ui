const fs = require('fs');
var ffi = require('@lwahonen/ffi-napi');
var path = require('path');
const { dialog } = require('electron');
let dllDir = null;
let ci64UV = null;
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
  dllDir = getAssetPath('SDK', 'Ci64UV', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
}

// all sdk functions related to ci64UV needs to expose here first
const loadCi64UVLibraryFunctions = () => {
  try {
    // exposing dll functions to electron
    ci64UV = ffi.Library(path.join(dllDir, 'Ci64UV'), {
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
      title: 'Exposing Ci64UV Library Functions',
      message: `Error loading ci64UV library :- ${error} && DLL file exists =>${fs.existsSync(path.join(dllDir, 'Ci64UV')) ? 'yes' : 'no'} `,
    });
  }
};

const connect = () => ci64UV.Connect();
const disconnect = () => ci64UV.Disconnect();
const getAvailableSettings = () => ci64UV.GetAvailableSettings();
const setOption = (option, value) => ci64UV.SetOption(option, value);
const setParam = (option, value) =>
  ci64UV.Execute(`PARAM SET ${option} ${value}`);

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
      const value = ci64UV.GetOption(key, options[key]);
      allOptions[key] = value;
    }
    return { res: true, allOptions, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

//set ci64UV device params
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

const createCi64UVConfigurationSettings = (options) => {
  const configObj = {};
  const illumination = options['Colorimetric.Illumination'];
  const observer = options['Colorimetric.Observer'] == 'TwoDegree' ? 2 : 10;
  configObj['Specular'] = options['Specular'];
  configObj['MeasAverageNum'] = options['MeasAverageNum'];
  configObj['IllumObs'] = illuobsType[`${illumination}/${observer}`];
  if (options['MeasurementMode'])
        configObj['MeasurementMode'] = options['MeasurementMode'];
  return configObj;
};

//set ci64UV device configuration settings
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
  var calProgress = ci64UV.Execute('CALSTATUS GET');

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

// manually perform calibration
const performCalibration = () => {
  try {
    const allSteps = ci64UV.GetCalSteps().split(';');

    allSteps.forEach((step) => {
      const res = ci64UV.CalibrateStep(step);

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
      const isSet = ci64UV.Execute(`DEFAULTTOL SET ${key} ${options[key]}`);

      if (!isSet) {
        throw new Error(`Error setting ${key} - ${options[key]}`);
      }
      const isStore = ci64UV.Execute(`DEFAULTTOL STORE`);
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
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

//change status of startMeasure
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

// get last error info
const getLastError = () => {
  const errorCode = ci64UV.GetLastErrorCode();
  const errorString = ci64UV.GetLastErrorString();
  return { errorCode, errorString };
};

//performs connection to ci64UV device
const connectCi64UVDevice = () => {
  try {
    // connection
    if (ci64UV.IsConnected()) return { res: true, error: null };
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

const disconnectCi64UVDevice = () => {
  try {
    // connection
    if (!ci64UV.IsConnected()) return { res: true, error: null };
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
    var calStatus = ci64UV.Execute('CALSTATUS GET');
    if (calStatus.includes('OK')) {
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

const getCalibrationExpireTime = () => {
  var calStatus = ci64UV.Execute('CALSTATUS GET');
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

//Export Measurement Data
const execQuery = (query) => {
  return ci64UV.Execute(query);
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

const getSampleInfo = (options, index, geometry) => {
  const sampleInfo = {};
  try {
    options.forEach((key) => {
      if (key == 'NETPROFILERSTATUS') {
        sampleInfo[key] = ci64UV.GetOption('NetProfiler');
      } else if (key == 'TRANSFORMID') {
        sampleInfo[key] = getTransformName(
          execQuery(`SAMPLE GET ${key} ${index} ${geometry}`)
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
    sampleData['reflectanceData'] = {
      refSpinData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET REFL ${index} SPIN`).split(' ')
      ),
      refSpexData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET REFL ${index} SPEX`).split(' ')
      ),
    };
    sampleData['LABData'] = {
      labSpinData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET LAB ${index} SPIN`).split(' ')
      ),
      labSpexData: convertFloatValues(
        ci64UV.Execute(`SAMPLE GET LAB ${index} SPEX`).split(' ')
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

const getCi64UVSampleCount = () => ci64UV.GetSampleCount();

const getCi64UVAllSamples = () =>
  new Promise((resolve) => {
    try {
      let error = null;
      const data = [];
      const header =
        'Name,TimeStamp,Aperture,NetProfiler Status,Transform,Trigger Mode,Project ID,Job ID,Standard,400 nm (SPIN),410 nm (SPIN),420 nm (SPIN),430 nm (SPIN),440 nm (SPIN),450 nm (SPIN),460 nm (SPIN),470 nm (SPIN),480 nm (SPIN),490 nm (SPIN),500 nm (SPIN),510 nm (SPIN),520 nm (SPIN),530 nm (SPIN),540 nm (SPIN),550 nm (SPIN),560 nm (SPIN),570 nm (SPIN),580 nm (SPIN),590 nm (SPIN),600 nm (SPIN),610 nm (SPIN),620 nm (SPIN),630 nm (SPIN),640 nm (SPIN),650 nm (SPIN),660 nm (SPIN),670 nm (SPIN),680 nm (SPIN),690 nm (SPIN),700 nm (SPIN),400 nm (SPEX),410 nm (SPEX),420 nm (SPEX),430 nm (SPEX),440 nm (SPEX),450 nm (SPEX),460 nm (SPEX),470 nm (SPEX),480 nm (SPEX),490 nm (SPEX),500 nm (SPEX),510 nm (SPEX),520 nm (SPEX),530 nm (SPEX),540 nm (SPEX),550 nm (SPEX),560 nm (SPEX),570 nm (SPEX),580 nm (SPEX),590 nm (SPEX),600 nm (SPEX),610 nm (SPEX),620 nm (SPEX),630 nm (SPEX),640 nm (SPEX),650 nm (SPEX),660 nm (SPEX),670 nm (SPEX),680 nm (SPEX),690 nm (SPEX),700 nm (SPEX),L value (SPIN)LAB,A value (SPIN)LAB,B value (SPIN)LAB,L value (SPEX)LAB,A value (SPEX)LAB,B value (SPEX)LAB'.split(
          ','
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
          if(error.errorString == 'Receive: Timeout' || error.errorCode == 20485){
            resolve({
              res: true,
              message: 'All samples data has been cleared from the device with timeout',
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

const testCi64UV = () => {
  try {
    loadCi64UVLibraryFunctions();
    var isDisconnected = ci64UV.Disconnect();
    console.log({ isDisconnected });
    console.log(`isConnected ${ci64UV.IsConnected()}`);
    var interfaceVersion = ci64UV.GetInterfaceVersion();
    console.log({ interfaceVersion });
    var allAvailabelSettings = getAvailableSettings();
    console.log({ allAvailabelSettings });

    // console.log(
    //   "trigger option button  " + ci64UV.SetOption("Reading_Mode", "Button")
    // );

    allAvailabelSettings.split(';').forEach((setting) => {
      console.log(setting + ' ' + ci64UV.GetSettingOptions(setting));
      console.log('default value ' + ' - ' + ci64UV.GetOption(setting));
    });

    console.log({
      setMeasurementMode: ci64UV.SetOption('Measurement_Mode', 'Tungsten'),
      setMeasurementMode1: ci64UV.SetOption('Measurement_Mode', 'UV_D65'),
      setMeasurementMode2: ci64UV.SetOption('Measurement_Mode', 'UV_ADJ1'),
      setMeasurementMode3: ci64UV.SetOption('Measurement_Mode', 'UV_ADJ2'),
    });
    console.log({
      measurementMode: ci64UV.GetSettingOptions('Measurement_Mode'),
    });
    console.log('default value ' + ' - ' + ci64UV.GetOption('Measurement_Mode'));

    console.log('version : ' + ci64UV.Execute('VERSION GET'));
    console.log(`calibration standard ${ci64UV.GetCalibrationStandard()}`);
    console.log(`calibration steps ${ci64UV.GetCalSteps()}`);
    console.log(`calStatus ${ci64UV.Execute('CALSTATUS GET')}`);
    const spectralCount = ci64UV.GetSpectralSetCount();
    console.log(`spectralCount ${spectralCount}`);
    for (let i = 0; i < spectralCount; i++) {
      const countName = ci64UV.GetSpectralSetName(i);
      console.log({ countName });
    }
    // connection
    var isConnect = connect();
    if (!isConnect) {
      console.log('error connecting');
      var error = getLastError();
      console.log(error);
      return;
    }
    console.log(`isConnected ${ci64UV.IsConnected()}`);
    // console.log(
    //   "trigger option button  " + ci64UV.SetOption("Reading_Mode", "Pressure")
    // );
    // console.log("volume get " + ci64UV.Execute("PARAM GET VolumeLevel"));
    // console.log("volume set " + ci64UV.Execute("PARAM SET VolumeLevel 1")); //working
    // console.log("volume get " + ci64UV.Execute("PARAM GET VolumeLevel"));
    // console.log("perform calibration !!!");
    // console.log(" calMode " + ci64UV.GetCalMode());
    // console.log(" timeout " + ci64UV.Execute("PARAM GET CalWhiteTimeout"));
    // // PARAM SET CalWhiteTimeout 8
    // console.log(" timeout set " + ci64UV.Execute("PARAM SET CalWhiteTimeout 0"));
    // console.log(" illuobs get " + ci64UV.Execute("PARAM GET ILLUMOBS"));
    // console.log(" illuobs set " + ci64UV.Execute("PARAM SET ILLUMOBS 5")); //working
    // console.log(" illuobs set " + ci64UV.Execute("PARAM SET COLORSPACE 2")); //working
    // console.log(
    //   " standard set tolerance illu " +
    //     ci64UV.Execute("STANDARD SET TOLERANCE ILLUMOBS 1 D65_10")
    // );
    // console.log(
    //   "defaulttol - " + ci64UV.Execute("DEFAULTTOL SET ILLUMOBS D65/10")
    // );
    // console.log("store " + ci64UV.Execute("DefaultTol Store"));
    console.log(`calibration standard ${ci64UV.GetCalibrationStandard()}`);
    console.log(`calibration steps ${ci64UV.GetCalSteps()}`);
    console.log(`calStatus ${ci64UV.Execute('CALSTATUS GET')}`);
    var calres = performCalibration();
    console.log({ calres });
    waitForCi64UVCalibrationComplete(() => {
      console.log('getting white cal value');
      var whiteCalValue = getCi64UVWhiteCalibrationResult();
      console.log({ whiteCalValue });
      console.log(`measurement status - ${isDataReady()}`);
      console.log('perform measurement !!');
      //var measureRes = performMeasurement();
      console.log({ measureRes });
      waitForUVMeasurementComplete(() => {
        console.log('getting measurement data');
        var measurementData = getCi64UVMeasurementData();
        console.log({ measurementData });
        console.log(`after getting data measurement status - ${isDataReady()}`);
        var getSpectralData = ci64UV.GetSpectralData(0, 0);
        console.log({ getSpectralData });
        console.log(
          `after getting Spectraldata measurement status - ${isDataReady()}`
        );
      });
    });
  } catch (error) {
    console.log(error);
  }
};

//testCi64UV();

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
  performMeasurement
};
