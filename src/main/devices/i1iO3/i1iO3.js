const fs = require('fs');
const ffi = require('@lwahonen/ffi-napi');
const ref = require('@lwahonen/ref-napi');;
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
  dllDir = getAssetPath('SDK', 'i1iO3', 'win', 'x64');
  process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
  dllDir = path.join(dllDir, 'i1IO3Bridge');
} else if (process.platform === 'darwin') {
  dllDir = getAssetPath(
    'SDK',
    'i1iO3',
    'mac',
    'i1iO3Bridge',
    'Output',
    'i1iO3Bridge'
  );
}

let i1iO3 = null;
let measurementString = '';
let startMeasure = false;
let measurementInterval = null;

const loadI1io3LibraryFunctions = () => {
  try {
    i1iO3 = ffi.Library(dllDir, {
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

    i1iO3.setOutputDirPath(userDataPath);
    i1iO3.openOutputFile();
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing i1io3 Library Functions',
      message: `Error loading i1io3 library :- ${error} && DLL file exists =>${fs.existsSync(dllDir) ? 'yes' : 'no'} `,
    });
  }
};

const I1PRO3_SERIAL_NUMBER = 'SerialNumber';
const I1PRO3IO_SERIAL_NUMBER = 'I1PRO3T_SerialNumber';
const I1PRO3_TIME_SINCE_LAST_CALIBRATION = 'TimeSinceLastCalibration';
const I1PRO3IO_SDK_VERSION = 'I1PRO3T_SDKVersion';
const I1PRO3_SDK_VERSION = 'SDKVersion';
const I1PRO3IO_SDK_VERSION_REVISION = 'I1PRO3T_SDKVersionRevision';
const I1PRO3_SDK_VERSION_REVISION = 'SDKVersionRevision';
const I1PRO3_LAST_ERROR_TEXT = 'LastErrorText';
const I1PRO3_LAST_ERROR_NUMBER = 'LastErrorNumber';
const I1PRO3_MEASUREMENT_MODE = 'MeasurementMode';
const I1PRO3_REFLECTANCE_SCAN = 'ReflectanceScan';
const I1PRO3_PATCH_RECOGNITION_KEY = 'RecognitionKey';
const I1PRO3_PATCH_RECOGNITION_BASIC = 'RecognitionBasic';
const I1PRO3_RESULT_INDEX_KEY = 'ResultIndexKey';
const I1PRO3_RESET = 'Reset';
const I1PRO3_ALL = 'All';

const buttonType = {
  e3ButtonIsPressed: 1000,
  e3ButtonNotPressed: 1001,
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
const clearI1IO3MeasurementInterval = () => {
  clearInterval(measurementInterval);
  measurementInterval = null;
};

// common helper function to wait for buttonPress,
// passed callback function will be called after button pressed
const waitForButtonPressedI1IO3 = (callback) => {
  try {
    // flus last button status
    i1iO3.getButtonStatus();

    startMeasure = true;
    let buttonStatus = buttonType.e3ButtonNotPressed;
    clearInterval(measurementInterval);
    measurementInterval = setInterval(() => {
      if (!startMeasure) {
        clearI1IO3MeasurementInterval();
        const resMsg = {
          res: false,
          error: { message: 'Measurement Failed : Device Timed-out' },
        };
        callback(resMsg);
        return;
      }

      buttonStatus = i1iO3.getButtonStatus();
      if (buttonStatus === buttonType.e3ButtonIsPressed) {
        clearI1IO3MeasurementInterval();
        startMeasure = false;
        callback({ res: true, error: null });
      }
    }, 300);
  } catch (error) {
    startMeasure = false;
    clearI1IO3MeasurementInterval();
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
    i1iO3.getGlobalOption(I1PRO3_LAST_ERROR_TEXT, msgBuffer, msgLength);
    const msg = getActualMsgFromBuffer(msgBuffer);
    i1iO3.getGlobalOption(I1PRO3_LAST_ERROR_NUMBER, msgBuffer, msgLength);
    const msgNo = getActualMsgFromBuffer(msgBuffer);
    return { errorNo: msgNo, message: msg };
  } catch (error) {
    return { errorNo: null, message: error?.message };
  }
};

const openI1iO3Device = () => {
  try {
    const regRes = i1iO3.registerTableExtensions();

    if (regRes !== 0) {
      i1iO3.setGlobalOption(I1PRO3_RESET, I1PRO3_ALL);
      return {
        res: false,
        error: printErrorInfo()
      };
    }

    const openRes = i1iO3.openDevice();

    if (!openRes) {
      i1iO3.setGlobalOption(I1PRO3_RESET, I1PRO3_ALL);
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
    i1iO3.setGlobalOption(I1PRO3_RESET, I1PRO3_ALL);
    return {
      res: false,
      error: {
        errorNo: 0,
        message: error?.message
      }
    };
  }
};

const getI1IO3SerialNumber = () => {
  try {
    sEC = i1iO3.getOption(I1PRO3IO_SERIAL_NUMBER, msgBuffer, msgLength);
    return getActualMsgFromBuffer(msgBuffer);
  } catch (error) {
    return null;
  }
};

const getI1IO3BasicDeviceInfo = () => {
  try {
    const deviceInfo = {};
    const options = {
      SerialNumber: I1PRO3_SERIAL_NUMBER,
      SDKVersion: I1PRO3_SDK_VERSION,
      SDKVersionRevision: I1PRO3_SDK_VERSION_REVISION,
      TimeSinceLastCalibration: I1PRO3_TIME_SINCE_LAST_CALIBRATION,
      IOSerialNumber: I1PRO3IO_SERIAL_NUMBER,
      IOSDKVersion: I1PRO3IO_SDK_VERSION,
      IOSDKVersionRevision: I1PRO3IO_SDK_VERSION_REVISION,
    };
    options.forEach((key) => {
      try {
        sEC = i1iO3.getOption(options[key], msgBuffer, msgLength);
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

const resetMeasStringI1IO3 = () => {
  try {
    const res = i1iO3.resetMeasurementString();
    return res;
  } catch (error) {
    return false;
  }
};

const getMeasDataFromOutputFilesI1IO3 = () => {
  const measurementData = {};
  i1iO3.getOption(I1PRO3_RESULT_INDEX_KEY, msgBuffer, msgLength);
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
  const res = i1iO3.grabInitialPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const getTopLeftChartPosition = () => {
  const res = i1iO3.getTopLeftChartPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const getBottomLeftChartPosition = () => {
  const res = i1iO3.getBottomLeftChartPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const getBottomRightChartPosition = () => {
  const res = i1iO3.getBottomRightChartPosition();
  if (res) return { res, error: null };
  return { res, error: printErrorInfo() };
};

const grabInitialPositionI1IO3 = () => grabInitialPosition();
const getTopLeftChartPositionI1IO3 = () => getTopLeftChartPosition();
const getBottomLeftChartPositionI1IO3 = () => getBottomLeftChartPosition();
const getBottomRightChartPositionI1IO3 = () => getBottomRightChartPosition();

const getOutputFileDataI1IO3 = () => {
  try {
    i1iO3.getMeasurementString(measBuffer);
    measurementString = getActualMsgFromBuffer(measBuffer);
    if (!measurementString) throw new Error('Error getting measurement values');
    const data = Buffer.from(measurementString).toString('base64');
    return { res: true, data, error: null };
  } catch (error) {
    return { res: false, data: null, error: error.message };
  }
};

const calibrateI1IO3Device = () => {
  const calRes = i1iO3.calibrateDevice();
  if (calRes !== 0) return { res: false, error: printErrorInfo() };
  return { res: true, error: null };
};

const closeI1IO3Device = () => {
  const clsRes = i1iO3.closeDevice();
  i1iO3.setGlobalOption(I1PRO3_RESET, I1PRO3_ALL);
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

// set i1io3 options
const setI1IO3Options = (options) => {
  try {
    options[I1PRO3_MEASUREMENT_MODE] = I1PRO3_REFLECTANCE_SCAN;
    options[I1PRO3_PATCH_RECOGNITION_KEY] = I1PRO3_PATCH_RECOGNITION_BASIC;
    Object.keys(options).forEach((key) => {
      if (key === 'MeasAverageNum') {
        return;
      }
      sEC = i1iO3.setOption(key, options[key]);

      if (sEC !== 0) {
        printErrorInfo();
        throw new Error(
          `Setting ${key} option failed : printErrorInfo().message`
        );
      }
    });

    return { res: true, error: null };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const updateI1IO3StartMeasure = (value) => {
  startMeasure = value;
};

const getI1IO3StartMeasure = () => startMeasure;

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

const scanChartAutomaticI1IO3 = (
  nRows,
  nColumns,
  nGapSize,
  ignorePatchAtLastRow
) => {
  try {
    startMeasure = true;

    const valRes = validateScanProps(nColumns, nRows, nGapSize);
    if (!valRes.res) throw new Error(valRes.error);

    const scanRes = i1iO3.scanChart(
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
  loadI1io3LibraryFunctions,
  openI1iO3Device,
  closeI1IO3Device,
  getI1IO3SerialNumber,
  getI1IO3BasicDeviceInfo,
  setI1IO3Options,
  calibrateI1IO3Device,
  grabInitialPositionI1IO3,
  getTopLeftChartPositionI1IO3,
  getBottomLeftChartPositionI1IO3,
  getBottomRightChartPositionI1IO3,
  scanChartAutomaticI1IO3,
  getOutputFileDataI1IO3,
  getMeasDataFromOutputFilesI1IO3,
  resetMeasStringI1IO3,
  waitForButtonPressedI1IO3,
  updateI1IO3StartMeasure,
  getI1IO3StartMeasure,
};
