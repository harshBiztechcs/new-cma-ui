const fs = require('fs');
const ffi = require('@lwahonen/ffi-napi');
const ref = require('@lwahonen/ref-napi');
const path = require('path');
const { dialog, app } = require('electron');
const { getAssetPath } = require('../../util');

let dllDir = null;
let sEC = null;

const userDataPath = app.getPath('userData');

// msg buffer for error/result output
const measBuffer = Buffer.alloc(40000);
measBuffer.type = ref.types.char;

if (process.platform === 'win32') {
  dllDir = getAssetPath('SDK', 'i1iO', 'win', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
  dllDir = path.join(dllDir, 'i1iOBridge');
} else if (process.platform === 'darwin') {
  dllDir = getAssetPath(
    'SDK',
    'i1iO',
    'mac',
    'i1iOBridge',
    'Output',
    'i1iOBridge'
  );
}

let i1iO = null;
let measurementString = '';
let startMeasure = false;
let measurementInterval = null;

const loadI1IOLibraryFunctions = () => {
  try {
    i1iO = ffi.Library(dllDir, {
      registerTableExtensions: ['int', []],
      getOption: ['int', ['string', 'string', 'int *']],
      setOption: ['int', ['string', 'string']],
      setGlobalOption: ['int', ['string', 'string']],
      getGlobalOption: ['string', ['string', 'char *', 'int *']],
      getGlobalOptionD: ['string', ['string']],
      openDevice: ['bool', []],
      closeDevice: ['int', []],
      getButtonStatus: ['int', []],
      getTopLeftChartPosition: ['bool', []],
      getBottomLeftChartPosition: ['bool', []],
      getBottomRightChartPosition: ['bool', []],
      scanChart: ['bool', ['int', 'int', 'float', 'string', 'bool', 'int']],
      getConnectionStatus: ['int', []],
      calibrateDevice: ['int', []],
      grabInitialPosition: ['bool', []],
      setOutputDirPath: ['bool', ['string']],
      openOutputFile: ['bool', []],
      closeOutputFile: ['bool', []],
      getMeasurementString: ['bool', ['char *']],
      resetMeasurementString: ['bool', []],
    });

    i1iO.setOutputDirPath(userDataPath);
    i1iO.openOutputFile();
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing i1io Library Functions',
      message: `Error loading i1io library :- ${error} && DLL file exists =>${fs.existsSync(dllDir) ? 'yes' : 'no'} `,
    });
  }
};

const I1_SERIAL_NUMBER = 'SerialNumber';
const I1IO_SERIAL_NUMBER = 'I1T_SerialNumber';
const I1_TIME_SINCE_LAST_CALIBRATION = 'TimeSinceLastCalibration';
const I1IO_SDK_VERSION = 'I1T_SDKVersion';
const I1_SDK_VERSION = 'SDKVersion';
const I1IO_SDK_VERSION_REVISION = 'I1T_SDKVersionRevision';
const I1_SDK_VERSION_REVISION = 'SDKVersionRevision';
const I1_LAST_ERROR_TEXT = 'LastErrorText';
const I1_LAST_ERROR_NUMBER = 'LastErrorNumber';
const I1_MEASUREMENT_MODE = 'MeasurementMode';
const I1_REFLECTANCE_SCAN = 'ReflectanceScan';
const I1_DUAL_REFLECTANCE_SCAN = 'DualReflectanceScan';
const I1_PATCH_RECOGNITION_KEY = 'RecognitionKey';
const I1_PATCH_RECOGNITION_BASIC = 'RecognitionBasic';
const I1_RESULT_INDEX_KEY = 'ResultIndexKey';
const I1_RESET = 'Reset';
const I1_ALL = 'All';

const buttonType = {
  eButtonIsPressed: 1000,
  eButtonNotPressed: 1001,
};

// msg buffer for error/result output
const msgBuffer = Buffer.alloc(256);
msgBuffer.type = ref.types.char;
// msg buffer length pointer
const msgLength = Buffer.alloc(4);
msgLength.type = ref.types.uint32;
msgLength.writeInt32LE(65000, 0);

const getActualMsgFromBuffer = (mBuffer) => {
  const msg = mBuffer.toString('utf-8');
  const index = msg.indexOf('\u0000');
  const actualMsg = index === -1 ? msg : msg.substring(0, index);
  return actualMsg;
};

// to clear measurement interval
const clearI1IOMeasurementInterval = () => {
  clearInterval(measurementInterval);
  measurementInterval = null;
};

// common helper function to wait for buttonPress,
// passed callback function will be called after button pressed
const waitForButtonPressed = (callback) => {
  try {
    // flus last button status
    i1iO.getButtonStatus();

    startMeasure = true;
    let buttonStatus = buttonType.eButtonNotPressed;
    clearInterval(measurementInterval);
    measurementInterval = setInterval(() => {
      if (!startMeasure) {
        clearI1IOMeasurementInterval();
        const resMsg = {
          res: false,
          error: { message: 'Measurement Failed : Device Timed-out' },
        };
        callback(resMsg);
        return;
      }

      buttonStatus = i1iO.getButtonStatus();
      if (buttonStatus === buttonType.eButtonIsPressed) {
        clearI1IOMeasurementInterval();
        startMeasure = false;
        callback({ res: true, error: null });
      }
    }, 300);
  } catch (error) {
    startMeasure = false;
    clearI1IOMeasurementInterval();
    const resMsg = {
      res: false,
      error: { message: `Measurement Failed : ${error.message}` },
    };
    callback(resMsg);
  }
};

// prints last error info
const printErrorInfo = () => {
  try {
    i1iO.getGlobalOption(I1_LAST_ERROR_TEXT, msgBuffer, msgLength);
    const msg = getActualMsgFromBuffer(msgBuffer);
    i1iO.getGlobalOption(I1_LAST_ERROR_NUMBER, msgBuffer, msgLength);
    const msgNo = getActualMsgFromBuffer(msgBuffer);
    return { errorNo: msgNo, message: msg };
  } catch (error) {
    return { errorNo: null, message: error?.message };
  }
};

const openI1IODevice = () => {
  try {
    const regRes = i1iO.registerTableExtensions();

    if (regRes !== 0) {
      i1iO.setGlobalOption(I1_RESET, I1_ALL);
      return {
        res: false,
        error: printErrorInfo()
      };
    }

    const openRes = i1iO.openDevice();

    if (!openRes) {
      i1iO.setGlobalOption(I1_RESET, I1_ALL);
      return {
        res: false,
        error: printErrorInfo()
      };
    }

    return {
      res: true,
      error: null
    };
  } catch (error) {
    i1iO.setGlobalOption(I1_RESET, I1_ALL);
    return {
      res: false,
      error: {
        errorNo: 0,
        message: error?.message
      }
    };
  }
};

const getI1IOSerialNumber = () => {
  try {
    sEC = i1iO.getOption(I1IO_SERIAL_NUMBER, msgBuffer, msgLength);
    return getActualMsgFromBuffer(msgBuffer);
  } catch (error) {
    return null;
  }
};

const getI1IOBasicDeviceInfo = () => {
  try {
    const deviceInfo = {};
    const options = {
      SerialNumber: I1_SERIAL_NUMBER,
      SDKVersion: I1_SDK_VERSION,
      SDKVersionRevision: I1_SDK_VERSION_REVISION,
      TimeSinceLastCalibration: I1_TIME_SINCE_LAST_CALIBRATION,
      IOSerialNumber: I1IO_SERIAL_NUMBER,
      IOSDKVersion: I1IO_SDK_VERSION,
      IOSDKVersionRevision: I1IO_SDK_VERSION_REVISION,
    };
    options.forEach((key) => {
      try {
        sEC = i1iO.getOption(options[key], msgBuffer, msgLength);
        deviceInfo[key] = getActualMsgFromBuffer(msgBuffer);
      } catch (error) {
        deviceInfo[key] = null;
      }
    });
    return deviceInfo;
  } catch (error) {
    return null;
  }
};

const resetMeasStringI1IO = () => {
  try {
    const res = i1iO.resetMeasurementString();
    return res;
  } catch (error) {
    return false;
  }
};

const getMeasDataFromOutputFilesI1IO = () => {
  const measurementData = {};
  i1iO.getOption(I1_RESULT_INDEX_KEY, msgBuffer, msgLength);
  const mode = getActualMsgFromBuffer(msgBuffer);
  try {
    const startIndex = measurementString.indexOf('BEGIN_DATA');
    const endIndex = measurementString.indexOf('END_DATA');
    const resultData = measurementString.substring(startIndex, endIndex);
    if (resultData) {
      const tempData = {};
      resultData.split('\n').forEach((x) => {
        if (!(x.includes('BEGIN_DATA') || x === '')) {
          const lineData = x.trim().split(' ');
          tempData[lineData[1]] = lineData.filter(
            (val, index) => !(index === 0 || index === 1)
          );
        }
      });
      measurementData[mode] = tempData;
    }
    return measurementData;
  } catch (error) {
    return null;
  }
};

const grabInitialPosition = () => {
  const res = i1iO.grabInitialPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const getTopLeftChartPosition = () => {
  const res = i1iO.getTopLeftChartPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const getBottomLeftChartPosition = () => {
  const res = i1iO.getBottomLeftChartPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const getBottomRightChartPosition = () => {
  const res = i1iO.getBottomRightChartPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const grabInitialPositionI1IO = () => grabInitialPosition();
const getTopLeftChartPositionI1IO = () => getTopLeftChartPosition();
const getBottomLeftChartPositionI1IO = () => getBottomLeftChartPosition();
const getBottomRightChartPositionI1IO = () => getBottomRightChartPosition();

const getOutputFileDataI1IO = () => {
  try {
    i1iO.getMeasurementString(measBuffer);
    measurementString = getActualMsgFromBuffer(measBuffer);
    if (!measurementString) throw new Error('Error getting measurement values');
    const data = Buffer.from(measurementString).toString('base64');
    return { res: true, data, error: null };
  } catch (error) {
    return { res: false, data: null, error: error.message };
  }
};

const waitForButtonPressedI1IO = (callback) => waitForButtonPressed(callback);

const   calibrateI1IODevice = () => {
  const calRes = i1iO.calibrateDevice();
  if (calRes !== 0) return { res: false, error: printErrorInfo() };
  return { res: true, error: null };
};

const closeI1IODevice = () => {
  const clsRes = i1iO.closeDevice();
  i1iO.setGlobalOption(I1_RESET, I1_ALL);
  if (clsRes !== 0) return { res: false, error: printErrorInfo().message };
  return { res: true, error: null };
};

const convertInt = (val) => {
  const res = parseInt(val, 10);
  if (Number.isNaN(res)) {
    return 0;
  }
  return res;
};

const convertFloat = (val) => {
  const res = parseFloat(val);
  if (Number.isNaN(res)) {
    return 0;
  }
  return res;
};

// set I1IO options
const setI1IOOptions = (options) => {
  try {
      let setPrior = [];

      setPrior[I1_MEASUREMENT_MODE] = options["ResultIndexKey"] == "M0" ? I1_REFLECTANCE_SCAN : I1_DUAL_REFLECTANCE_SCAN;
      //  setPrior[I1_MEASUREMENT_MODE] = I1_DUAL_REFLECTANCE_SCAN;
      //  setPrior[I1_PATCH_RECOGNITION_KEY] = I1_PATCH_RECOGNITION_BASIC;

       const finalOptions = { ...setPrior, ...options } ;

       Object.keys({ ...setPrior, ...options }).forEach((key) => {
         if (key === 'MeasAverageNum') {
           return;
         }

      sEC = i1iO.setOption(key, finalOptions[key]);

      if (sEC !== 0) {
        printErrorInfo();
        throw new Error(
          `Setting ${key} option failed : ${printErrorInfo().message}`
        );
      }
    });

    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const updateI1IOStartMeasure = (value) => {
  startMeasure = value;
};

const getI1IOStartMeasure = () => startMeasure;

const validateScanProps = (column, row, patchGap) => {
  try {
    if (convertInt(column) < 2)
      throw new Error('Columns should be more than 1');
    if (convertInt(row) < 1) throw new Error('Rows should be at least 1');
    const patch = convertFloat(patchGap);
    if (!(patch >= 0 && patch <= 2)) {
      throw new Error('Gap size should be between 0.0 mm to 2.0 mm');
    }
    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const scanChartAutomaticI1IO = (
  nRows,
  nColumns,
  nGapSize,
  ignorePatchAtLastRow
) => {
  try {
    startMeasure = true;

    const valRes = validateScanProps(nColumns, nRows, nGapSize);
    if (!valRes.res) throw new Error(valRes.error);

    const scanRes = i1iO.scanChart(
      nRows,
      nColumns,
      nGapSize,
      'false',
      true,
      ignorePatchAtLastRow
    );
    startMeasure = false;
    if (!scanRes) return { res: false, error: printErrorInfo() };
    return { res: true, error: null };
  } catch (error) {
    startMeasure = false;
    return { res: false, error: { errorNo: 0, message: error?.message } };
  }
};

module.exports = {
  loadI1IOLibraryFunctions,
  openI1IODevice,
  closeI1IODevice,
  getI1IOSerialNumber,
  getI1IOBasicDeviceInfo,
  setI1IOOptions,
  calibrateI1IODevice,
  grabInitialPositionI1IO,
  getTopLeftChartPositionI1IO,
  getBottomLeftChartPositionI1IO,
  getBottomRightChartPositionI1IO,
  scanChartAutomaticI1IO,
  getOutputFileDataI1IO,
  getMeasDataFromOutputFilesI1IO,
  resetMeasStringI1IO,
  waitForButtonPressedI1IO,
  updateI1IOStartMeasure,
  getI1IOStartMeasure,
  validateScanProps,
};
