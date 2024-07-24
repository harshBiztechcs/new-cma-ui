const fs = require('fs');
var ffi = require('@lwahonen/ffi-napi');
const { dialog } = require('electron');
var path = require('path');
var ref = require('@lwahonen/ref-napi')
const {
  I1_LAST_ERROR_TEXT,
  I1_LAST_ERROR_NUMBER,
  buttonType,
  COLOR_SPACE_KEY,
  COLOR_SPACE_CIELab,
  COLOR_SPACE_RGB,
  I1_MEASUREMENT_MODE,
  I1_RESULT_INDEX_KEY,
  I1_ILLUMINATION_CONDITION_M0,
  I1_ILLUMINATION_CONDITION_M1,
  I1_ILLUMINATION_CONDITION_M2,
  I1_ILLUMINATION_CONDITION_M3,
  OBSERVER_KEY,
  ILLUMINATION_KEY,
  I1_MEASURE_COUNT,
  connectionStatus,
  I1_SERIAL_NUMBER,
  I1_TIME_SINCE_LAST_CALIBRATION,
  I1_SDK_VERSION,
  I1_SDK_VERSION_REVISION,
  I1_DUAL_REFLECTANCE_SPOT,
} = require('./constants');
const { getAssetPath } = require('../../util');

let ArrayType = require('ref-array-di')(ref);
let float = ref.types.float;
let FloatArray = ArrayType(float);

let sEC = null;
//msg buffer for error/result output
let msgBuffer = new Buffer.alloc(256);
msgBuffer.type = ref.types.char;
//msg buffer length pointer
let msgLength = new Buffer.alloc(4);
msgLength.type = ref.types.uint32;
msgLength.writeInt32LE(65000, 0);

let dllDir = null;
let measAvgNum = 1;
let startMeasure = false;
let measurementInterval = null;
let resultIndexKey = null;

//constant
let M0_M1_M2 = 'M0_M1_M2';

if (process.platform == 'win32') {
  dllDir = getAssetPath('SDK', 'i1Pro', 'win', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
} else if (process.platform == 'darwin') {
  dllDir = getAssetPath('SDK', 'i1Pro', 'mac', 'i1ProBridge', 'Output');
}

let i1Pro = null;

const loadI1ProLibraryFunctions = () => {
  try {
    i1Pro = ffi.Library(path.join(dllDir, 'i1ProBridge'), {
      getOption: ['int', ['string', 'string', 'int *']],
      setOption: ['int', ['string', 'string']],
      setGlobalOption: ['int', ['string', 'string']],
      getGlobalOption: ['string', ['string', 'char *', 'int *']],
      getGlobalOptionD: ['string', ['string']],
      openDevice: ['bool', []],
      calibrate: ['int', []],
      calibrateReflectanceMode: ['int', []],
      calibrateReflectanceM3Mode: ['int', []],
      triggerMeasurement: ['int', []],
      getSpectrum: ['int', [FloatArray, 'int']],
      getTriStimulus: ['int', [FloatArray, 'int']],
      waitForButtonPressed: ['bool', []],
      getButtonStatus: ['int', []],
      getConnectionStatus: ['int', []],
    });
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing I1Pro2 Library Functions',
      message: `Error loading I1Pro2 library :- ${error} && DLL file exists =>${fs.existsSync(path.join(dllDir, 'i1ProBridge')) ? 'yes' : 'no'} `,
    });
  }
};

//open selected device
const openI1ProDevice = () => {
  try {
    //check if connection is already open
    const connStatus = i1Pro.getConnectionStatus();
    if (connStatus == connectionStatus.eI1ProOpen)
      return { res: true, error: null };

    var isOpen = i1Pro.openDevice();

    if (isOpen) {
      return { res: true, error: null };
    }

    const error = printErrorInfo();

    if (error.errorNo.includes('0x9001003')) {
      return { res: true, error: null }; //device is already open
    }
    return { res: false, error: error.message };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// sets all device options from odoo
const setI1ProDeviceOptions = (options) => {
  //set measurement mode to dual reflectance spot first to enable m0,m1,m2 settings
  options['MeasurementMode'] = I1_DUAL_REFLECTANCE_SPOT;
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
        resultIndexKey = options[key];
        //if all resultIndexKey is given then dont set in device
        if (resultIndexKey == M0_M1_M2) continue;
      }
      sEC = i1Pro.setOption(key, options[key]);
    }
    if (sEC != 0) {
      const { errorNo, message } = printErrorInfo();
      return { res: false, error: message };
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// performs calibration based on condition
const calibrateI1ProDevice = () => {
  try {
    sEC = i1Pro.setOption(I1_MEASUREMENT_MODE, I1_DUAL_REFLECTANCE_SPOT);
    sEC = i1Pro.calibrate();
    if (sEC != 0) {
      const { errorNo, message } = printErrorInfo();
      return { res: false, error: message };
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// performs measurement
const triggerI1ProMeasurement = () => {
  try {
    sEC = i1Pro.triggerMeasurement();
    if (sEC != 0) {
      const { errorNo, message } = printErrorInfo();
      return { res: false, error: message };
    } else {
      return { res: true, error: null };
    }
  } catch (error) {
    return { res: false, error: error?.message };
  }
};

// get Spectrum data of last measurement
const getI1ProSpectrumResult = () => {
  try {
    let spectrum = new FloatArray(36);
    sEC = i1Pro.getSpectrum(spectrum, 0);
    if (sEC != 0) {
      printErrorInfo();
      return null;
    } else {
      return spectrum.toArray();
    }
  } catch (error) {
    return null;
  }
};

// get TriStimulus data of last measurement
const getI1ProTriStimulusResult = () => {
  try {
    let triStimulus = new FloatArray(3);
    sEC = i1Pro.getTriStimulus(triStimulus, 0);

    if (sEC != 0) {
      printErrorInfo();
      return null;
    }
    return triStimulus.toArray();
  } catch (error) {
    return null;
  }
};

// get LAB data of last measurement
const getI1ProLABResult = () => {
  try {
    sEC = i1Pro.setOption(COLOR_SPACE_KEY, COLOR_SPACE_CIELab);

    return getI1ProTriStimulusResult();
  } catch (error) {
    return null;
  }
};

// get RGB data of last measurement
const getI1ProRGBResult = () => {
  try {
    sEC = i1Pro.setOption(COLOR_SPACE_KEY, COLOR_SPACE_RGB);

    return getI1ProTriStimulusResult();
  } catch (error) {
    return null;
  }
};

// get measurement info
const getI1ProMeasurementInfo = () => {
  try {
    const measurementInfo = {};
    const measurementParams = [
      I1_MEASUREMENT_MODE,
      I1_RESULT_INDEX_KEY,
      COLOR_SPACE_KEY,
      OBSERVER_KEY,
      ILLUMINATION_KEY,
      I1_MEASURE_COUNT,
    ];
    measurementParams.forEach((name) => {
      let msgBuffer = new Buffer.alloc(256);
      msgBuffer.type = ref.types.char;
      let msgLength = new Buffer.alloc(4);
      msgLength.type = ref.types.uint32;
      msgLength.writeInt32LE(65000, 0);
      sEC = i1Pro.getOption(name, msgBuffer, msgLength);
      measurementInfo[name] = getActualMsgFromBuffer(msgBuffer);
    });
    return measurementInfo;
  } catch (error) {
    return null;
  }
};

const updateI1PROStartMeasure = (value) => {
  startMeasure = value;
};

const getI1PROMeasureStatus = () => {
  return startMeasure;
};

// common helper function to wait for buttonPress,
// passed callback function will be called after button pressed
const waitForI1ProButtonPressed = (callback) => {
  try {
    // flush last button status
    i1Pro.getButtonStatus();

    startMeasure = true;

    var buttonStatus = buttonType.eButtonNotPressed;
    clearInterval(measurementInterval);
    measurementInterval = setInterval(() => {
      if (!startMeasure) {
        clearInterval(measurementInterval);
        const resMsg = {
          res: false,
          error: 'Measurement Failed : Device Disconnected !!',
        };
        callback(resMsg);
        return;
      }

      buttonStatus = i1Pro.getButtonStatus();
      if (buttonStatus == buttonType.eButtonIsPressed) {
        const resMsg = {
          res: true,
          error: null,
        };
        callback(resMsg);
        clearInterval(measurementInterval);
      }
    }, 300);
  } catch (error) {
    startMeasure = false;
    clearInterval(measurementInterval);
    const resMsg = {
      res: false,
      error: 'Measurement Failed',
    };
    callback(resMsg);
  }
};

// prints last error info
const printErrorInfo = () => {
  try {
    i1Pro.getGlobalOption(I1_LAST_ERROR_TEXT, msgBuffer, msgLength);

    const msg = getActualMsgFromBuffer(msgBuffer);
    i1Pro.getGlobalOption(I1_LAST_ERROR_NUMBER, msgBuffer, msgLength);

    const msgNo = getActualMsgFromBuffer(msgBuffer);

    return { errorNo: msgNo, message: msg };
  } catch (error) {
    return { errorNo: null, message: error?.message };
  }
};

const getI1ProSerialNumber = () => {
  try {
    sEC = i1Pro.getOption(I1_SERIAL_NUMBER, msgBuffer, msgLength);
    return getActualMsgFromBuffer(msgBuffer);
  } catch (error) {
    return null;
  }
};

//get basic device info
const getI1ProBasicDeviceInfo = () => {
  const keys = [
    I1_SERIAL_NUMBER,
    I1_TIME_SINCE_LAST_CALIBRATION,
    I1_SDK_VERSION,
    I1_SDK_VERSION_REVISION,
  ];
  const basicInfo = {};
  keys.forEach((key) => {
    try {
      sEC = i1Pro.getOption(key, msgBuffer, msgLength);
      basicInfo[key] = getActualMsgFromBuffer(msgBuffer);
      msgBuffer.fill('');
    } catch (error) {
      basicInfo[key] = null;
    }
  });
  return basicInfo;
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

const getIndexKeyMeasurementData = (indexKey) => {
  try {
    sEC = i1Pro.setOption(I1_RESULT_INDEX_KEY, indexKey);
    if (sEC != 0) {
      const error = printErrorInfo();
      return { res: false, error: error.message };
    }
    const spectrumData = getI1ProSpectrumResult();
    const LABData = getI1ProLABResult();
    if (LABData && spectrumData) {
      return { res: true, measData: { spectrumData, LABData }, error: null };
    }
    const error = printErrorInfo();
    return { res: false, error: error.message };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const getAvgOfAllResultKeyMeasurementOld = () => {
  try {
    const spectrumDatas = [];
    const LABDatas = [];
    const RGBDatas = [];
    const avgSpectumData = [];
    const avgLABData = [];
    const avgRGBData = [];
    for (let i = 0; i < measAvgNum; i++) {
      const res = triggerI1ProMeasurement();
      if (res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        spectrumDatas[i] = getI1ProSpectrumResult();

        LABDatas[i] = getI1ProLABResult();

        RGBDatas[i] = getI1ProRGBResult();
      } else {
        const error = printErrorInfo();
        return { res: false, error };
      }
    }

    avgM0SpectrumData = getAverageData(M0SpectrumData, measAvgNum);
    avgM1SpectrumData = getAverageData(M1SpectrumData, measAvgNum);
    avgM2SpectrumData = getAverageData(M2SpectrumData, measAvgNum);
    avgM0LABData = getAverageData(M0LABData, measAvgNum);
    avgM1LABData = getAverageData(M1LABData, measAvgNum);
    avgM2LABData = getAverageData(M2LABData, measAvgNum);
    return {
      res: true,
      measData: {
        M0SpectrumData: avgM0SpectrumData,
        M1SpectrumData: avgM1SpectrumData,
        M2SpectrumData: avgM2SpectrumData,
        M0LABData: avgM0LABData,
        M1LABData: avgM1LABData,
        M2LABData: avgM2LABData,
      },
    };
  } catch (error) {
    return { res: false, error: { message: error?.message } };
  }
};

const getAvgOfSingleResultKeyMeasurementOld = () => {
  try {
    let spectrumData = [];
    let LABData = [];
    let avgSpectrumData = [];
    let avgLABData = [];
    for (let i = 0; i < measAvgNum; i++) {
      const res = triggerI1ProMeasurement();
      if (res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        spectrumData[i] = getI1ProSpectrumResult();
        LABData[i] = getI1ProLABResult();
      } else {
        const error = printErrorInfo();
        return { res: false, error };
      }
      avgSpectumData[i] = avgSpectumData[i] / measAvgNum;
    }
    for (let i = 0; i < LABDatas[0].length; i++) {
      avgLABData[i] = 0;
      for (let j = 0; j < measAvgNum; j++) {
        avgLABData[i] = avgLABData[i] + LABDatas[j][i];
      }
      avgLABData[i] = avgLABData[i] / measAvgNum;
    }
    for (let i = 0; i < RGBDatas[0].length; i++) {
      avgRGBData[i] = 0;
      for (let j = 0; j < measAvgNum; j++) {
        avgRGBData[i] = avgRGBData[i] + RGBDatas[j][i];
      }
      avgRGBData[i] = avgRGBData[i] / measAvgNum;
    }
    const measurementInfo = getI1ProMeasurementInfo();
    return {
      res: true,
      avgSpectumData,
      avgLABData,
      avgRGBData,
      measurementInfo,
    };
  } catch (error) {
    return { res: false, error: { message: error?.message } };
  }
};

const waitForButtonPressPromise = () =>
  new Promise((resolve) => waitForI1ProButtonPressed((res) => resolve(res)));

const getAvgOfAllResultKeyMeasurement = async () => {
  try {
    let M0SpectrumData = [];
    let M1SpectrumData = [];
    let M2SpectrumData = [];
    let M0LABData = [];
    let M1LABData = [];
    let M2LABData = [];
    let avgM0SpectrumData = [];
    let avgM1SpectrumData = [];
    let avgM2SpectrumData = [];
    let avgM0LABData = [];
    let avgM1LABData = [];
    let avgM2LABData = [];
    for (let i = 0; i < measAvgNum; i++) {
      const buttonPressRes = await waitForButtonPressPromise();
      if (buttonPressRes.res) {
        const res = triggerI1ProMeasurement();
        if (res) {
          const M0MeasData = getIndexKeyMeasurementData(
            I1_ILLUMINATION_CONDITION_M0
          );
          const M1MeasData = getIndexKeyMeasurementData(
            I1_ILLUMINATION_CONDITION_M1
          );
          const M2MeasData = getIndexKeyMeasurementData(
            I1_ILLUMINATION_CONDITION_M2
          );
          //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
          M0SpectrumData[i] = M0MeasData.measData.spectrumData;
          M1SpectrumData[i] = M1MeasData.measData.spectrumData;
          M2SpectrumData[i] = M2MeasData.measData.spectrumData;
          M0LABData[i] = M0MeasData.measData.LABData;
          M1LABData[i] = M1MeasData.measData.LABData;
          M2LABData[i] = M2MeasData.measData.LABData;
        } else {
          const error = printErrorInfo();
          return { res: false, error };
        }
      } else {
        return { res: false, error: { message: buttonPressRes.error } };
      }
    }

    avgM0SpectrumData = getAverageData(M0SpectrumData, measAvgNum);
    avgM1SpectrumData = getAverageData(M1SpectrumData, measAvgNum);
    avgM2SpectrumData = getAverageData(M2SpectrumData, measAvgNum);
    avgM0LABData = getAverageData(M0LABData, measAvgNum);
    avgM1LABData = getAverageData(M1LABData, measAvgNum);
    avgM2LABData = getAverageData(M2LABData, measAvgNum);
    return {
      res: true,
      measData: {
        M0SpectrumData: avgM0SpectrumData,
        M1SpectrumData: avgM1SpectrumData,
        M2SpectrumData: avgM2SpectrumData,
        M0LABData: avgM0LABData,
        M1LABData: avgM1LABData,
        M2LABData: avgM2LABData,
      },
    };
  } catch (error) {
    return { res: false, error: { message: error?.message } };
  }
};

const getAvgOfSingleResultKeyMeasurement = async () => {
  try {
    let spectrumData = [];
    let LABData = [];
    let avgSpectrumData = [];
    let avgLABData = [];
    for (let i = 0; i < measAvgNum; i++) {
      const buttonPressRes = await waitForButtonPressPromise();
      if (buttonPressRes.res) {
        const MeasRes = triggerI1ProMeasurement();
        if (MeasRes.res) {
          //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
          spectrumData[i] = getI1ProSpectrumResult();
          LABData[i] = getI1ProLABResult();
        } else {
          const error = printErrorInfo();
          return { res: false, error };
        }
      } else {
        return { res: false, error: { message: buttonPressRes.error } };
      }
    }

    avgSpectrumData = getAverageData(spectrumData, measAvgNum);
    avgLABData = getAverageData(LABData, measAvgNum);
    return {
      res: true,
      measData: {
        spectrumData: avgSpectrumData,
        LABData: avgLABData,
      },
    };
  } catch (error) {
    return { res: false, error: { message: error?.message } };
  }
};

const triggerI1ProAvgMeasurement = async () => {
  if (resultIndexKey == M0_M1_M2) {
    return await getAvgOfAllResultKeyMeasurement();
  }
  return await getAvgOfSingleResultKeyMeasurement();
};

const getActualMsgFromBuffer = (msgBuffer) => {
  const msg = msgBuffer.toString('utf-8');
  const index = msg.indexOf('\u0000');
  const actualMsg = index == -1 ? msg : msg.substring(0, index);
  return actualMsg;
};

const testDemo = () => {
  loadI1ProLibraryFunctions();
  const openRes = openI1ProDevice();
  console.log({ openRes });
  if (!openRes.res) return;

  //setOptions for test

  const setOps = setI1ProDeviceOptions({ MeasurementMode: 'ReflectanceSpot' });

  // value - measurement mode for a spot measurement with Tungsten filament lamp and UV Led. Only available for i1Pro RevE devices
  // const setOps = setI1ProDeviceOptions({
  //   MeasurementMode: "DualReflectanceSpot",
  // }
  // );

  //value - measurement mode for a scan on a reflective surface (chart)
  // const setOps = setI1ProDeviceOptions({
  //   MeasurementMode: "ReflectanceScan",
  //   RecognitionKey: "RecognitionBasic",
  // });

  //value - measurement mode for a scan on a reflective surface (chart)
  //value - algorithm for scans with an i1Pro RevE ruler. Requires a valid I1_NUMBER_OF_PATCHES_PER_LINE value, which must be at least 6.
  // const setOps = setI1ProDeviceOptions({
  //   MeasurementMode: "DualReflectanceScan",
  //   RecognitionKey: "RecognitionPosition",
  //   PatchesPerLine: "6",
  //   ScanDirectionKey: "1",
  //   OnMeasurementSuccessNoLedIndication: "1",
  // });

  console.log({ setOps });
  if (!setOps.res) return;
  console.log('Press button for calibration !!');
  waitForI1ProButtonPressed(() => {
    const calRes = calibrateI1ProDevice();
    console.log({ calRes });
    if (!calRes.res) return;
    console.log('Press button for measurement !!');
    waitForI1ProButtonPressed(() => {
      const mesRes = triggerI1ProMeasurement();
      console.log({ mesRes });
      if (!mesRes.res) return;
      console.log({
        spectralData: getI1ProSpectrumResult(),
        LABData: getI1ProLABResult(),
        RGBData: getI1ProRGBResult(),
      });
    });
  });
};

//testDemo();

module.exports = {
  loadI1ProLibraryFunctions,
  openI1ProDevice,
  setI1ProDeviceOptions,
  calibrateI1ProDevice,
  triggerI1ProMeasurement,
  waitForI1ProButtonPressed,
  getI1ProSpectrumResult,
  getI1ProLABResult,
  getI1ProRGBResult,
  getI1ProMeasurementInfo,
  getI1ProBasicDeviceInfo,
  getI1ProSerialNumber,
  triggerI1ProAvgMeasurement,
  updateI1PROStartMeasure,
  getI1PROMeasureStatus,
};
