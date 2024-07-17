const fs = require('fs');
const {
  I1PRO3_964_REPORTING_KEY,
  I1PRO3_AVAILABLE_ILLUMINATIONS_KEY,
  I1PRO3_AVAILABLE_MEASUREMENT_MODES,
  I1PRO3_DEVICE_TYPE_KEY,
  I1PRO3_HAS_AMBIENT_LIGHT_KEY,
  I1PRO3_HAS_HEAD_SENSOR_KEY,
  I1PRO3_HAS_INDICATOR_LED_KEY,
  I1PRO3_HAS_LOW_RESOLUTION_KEY,
  I1PRO3_HAS_POLARIZER_KEY,
  I1PRO3_HAS_WAVELENGTH_LED_KEY,
  I1PRO3_HAS_ZEBRA_RULER_SENSOR_KEY,
  I1PRO3_HW_REVISION_KEY,
  I1PRO3_LAST_ERROR_NUMBER,
  I1PRO3_LAST_ERROR_TEXT,
  I1PRO3_MAX_RULER_LENGTH_KEY,
  I1PRO3_MEASUREMENT_GEOMETRY_KEY,
  I1PRO3_MEASUREMENT_MODE,
  I1PRO3_PRECISION_CALIBRATION_KEY,
  I1PRO3_REFLECTANCE_SPOT,
  I1PRO3_REFLECTANCE_SCAN,
  I1PRO3_SERIAL_NUMBER,
  I1PRO3_SUPPLIER_NAME_KEY,
  I1PRO3_YES,
  I1PRO3_TIME_SINCE_LAST_CALIBRATION,
  I1PRO3_TIME_UNTIL_CALIBRATION_EXPIRE,
  I1PRO3_AVAILABLE_RESULT_INDEXES_KEY,
  I1PRO3_VALUE_DELIMITER,
  I1PRO3_RESULT_INDEX_KEY,
  COLOR_SPACE_KEY,
  COLOR_SPACE_CIELab,
  COLOR_SPACE_RGB,
  I1PRO3_REFLECTANCE_M3_SPOT,
  I1PRO3_REFLECTANCE_M3_SCAN,
  I1PRO3_MEASURE_COUNT,
  I1PRO3_NUMBER_OF_PATCHES_PER_LINE,
  buttonType,
  OBSERVER_KEY,
  ILLUMINATION_KEY,
  I1PRO3_SDK_VERSION_REVISION,
  I1PRO3_SDK_VERSION,
  I1PRO3_ILLUMINATION_CONDITION_M0,
  I1PRO3_ILLUMINATION_CONDITION_M1,
  I1PRO3_ILLUMINATION_CONDITION_M2,
  I1PRO3_PATCH_RECOGNITION_KEY,
  I1PRO3_PATCH_RECOGNITION_BASIC,
  I1PRO3_PATCH_RECOGNITION_CORRELATION,
  I1PRO3_PATCH_RECOGNITION_POSITION,
  I1PRO3_PATCH_RECOGNITION_POSITION_DARK,
  I1PRO3_PATCH_RECOGNITION_FLASH,
  I1PRO3_PATCH_RECOGNITION_RECOGNIZED_PATCHES,
} = require('./constants');

var ffi = require('@lwahonen/ffi-napi');
const ref = require('@lwahonen/ref-napi');
const path = require('path');
const { dialog } = require('electron');
const { getAssetPath } = require('../../util');
const { checkCi62Calibration } = require('../ci62/ci62');

let ArrayType = require('ref-array-di')(ref);

// typedef
let float = ref.types.float;
// define the "int[]" type
let FloatArray = ArrayType(float);

let sEC = null;
//msg buffer for error/result output
let msgBuffer = new Buffer.alloc(256);
msgBuffer.type = ref.types.char;
//msg buffer length pointer
let msgLength = new Buffer.alloc(4);
msgLength.type = ref.types.uint32;
msgLength.writeInt32LE(65000, 0);

//number of entries in the array
let count = new Buffer.alloc(4);
count.type = ref.types.uint32;

//device state
let isReadyForCalibration = false;
let isCalibrationDone = false;
let isReadyForMeasurement = false;
let isM3Spot = false;
let dllDir = null;
let measAvgNum = 1;
let startMeasure = false;
let measurementInterval = null;
let measurementTimeout = null;
let resultIndexKey = null;

//constant
let M0_M1_M2 = 'M0_M1_M2';

try {
  if (process.platform == 'win32') {
    dllDir = getAssetPath('SDK', 'i1Pro3', 'x64');
    process.env.PATH = `${process.env.PATH}${path.delimiter}${dllDir}`;
  } else if (process.platform == 'darwin') {
    dllDir = getAssetPath('SDK', 'i1Pro3', 'mac', 'i1Pro3Bridge', 'Output');
  }
} catch (error) {
  dialog.showMessageBox(null, {
    title: 'path error library',
    message: 'path error library',
  });
}

let i1Pro3 = null;

// all sdk functions related to i1Pro3 needs to expose here first
const loadI1PRO3LibraryFunctions = () => {
  try {
    // exposing dll functions to electron
    i1Pro3 = ffi.Library(path.join(dllDir, 'i1Pro3Bridge'), {
      getSDKVersion: ['string', []],
      getOption: ['int', ['string', 'string', 'int *']],
      setOption: ['int', ['string', 'string']],
      setGlobalOption: ['int', ['string', 'string']],
      getGlobalOption: ['string', ['string', 'char *', 'int *']],
      openDevice: ['bool', []],
      calibrateDevice: ['int', []],
      calibrateReflectanceMode: ['int', []],
      calibrateReflectanceM3Mode: ['int', []],
      setReflectanceSpotMode: ['int', []],
      setReflectanceSpotM3Mode: ['int', []],
      triggerMeasurement: ['int', []],
      getSpectrum: ['int', [FloatArray, 'int']],
      getTriStimulus: ['int', [FloatArray, 'int']],
      waitForButtonPressed: ['bool', []],
      getButtonStatus: ['int', []],
      getNumberOfAvailableSamples: ['int', []],
    });
  } catch (error) {
    dialog.showMessageBox(null, {
      title: 'Exposing i1Pro3 Library Functions',
      message: `Error loading i1Pro3 library :- ${error} && DLL file exists =>${fs.existsSync(path.join(dllDir, 'i1Pro3Bridge')) ? 'yes' : 'no'} `,
    });
  }
};

//fetch all globaloptions info from sdk
const getSDKVersion = () => {
  try {
    const sdkVersion = i1Pro3.getSDKVersion();

    return sdkVersion;
  } catch (error) {
    return error.message;
  }
};

//open selected device
const openDevice = () => {
  try {
    var isOpen = i1Pro3.openDevice();

    if (!isOpen) {
      const error = printErrorInfo();

      if (error.message.includes('Device already open')) {
        return true; //device is already open
      }
    }
    return isOpen;
  } catch (error) {
    return false;
  }
};

const getI1Pro3SerialNumber = () => {
  try {
    sEC = i1Pro3.getOption(I1PRO3_SERIAL_NUMBER, msgBuffer, msgLength);
    return getActualMsgFromBuffer(msgBuffer);
  } catch (error) {
    return null;
  }
};

//get device info to be send to odoo after connection
const getI1Pro3BasicDeviceInfo = () => {
  const keys = [
    I1PRO3_SERIAL_NUMBER,
    I1PRO3_TIME_SINCE_LAST_CALIBRATION,
    I1PRO3_SDK_VERSION,
    I1PRO3_SDK_VERSION_REVISION,
  ];
  const basicInfo = {};
  keys.forEach((key) => {
    try {
      sEC = i1Pro3.getOption(key, msgBuffer, msgLength);
      basicInfo[key] = getActualMsgFromBuffer(msgBuffer);
      msgBuffer.fill('');
    } catch (error) {
      basicInfo[key] = null;
    }
  });
  return basicInfo;
};

//print opened device info
const printDeviceInfo = () => {
  try {
    sEC = i1Pro3.getOption(I1PRO3_SERIAL_NUMBER, msgBuffer, msgLength);
    console.log(
      'I1PRO3_SERIAL_NUMBER:               ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(
      I1PRO3_AVAILABLE_MEASUREMENT_MODES,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_AVAILABLE_MEASUREMENT_MODES: ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(
      I1PRO3_AVAILABLE_ILLUMINATIONS_KEY,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_AVAILABLE_ILLUMINATIONS_KEY: ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(
      I1PRO3_AVAILABLE_RESULT_INDEXES_KEY,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_AVAILABLE_RESULT_INDEXES_KEY: ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_964_REPORTING_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_964_REPORTING_KEY:           ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HAS_WAVELENGTH_LED_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HAS_WAVELENGTH_LED_KEY:      ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(
      I1PRO3_HAS_ZEBRA_RULER_SENSOR_KEY,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_HAS_ZEBRA_RULER_SENSOR_KEY:  ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HAS_HEAD_SENSOR_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HAS_HEAD_SENSOR_KEY:         ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HAS_INDICATOR_LED_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HAS_INDICATOR_LED_KEY:       ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HAS_AMBIENT_LIGHT_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HAS_AMBIENT_LIGHT_KEY:       ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HAS_POLARIZER_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HAS_POLARIZER_KEY:           ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HAS_LOW_RESOLUTION_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HAS_LOW_RESOLUTION_KEY:      ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_MAX_RULER_LENGTH_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_MAX_RULER_LENGTH_KEY:        ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_HW_REVISION_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_HW_REVISION_KEY:             ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_SUPPLIER_NAME_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_SUPPLIER_NAME_KEY:           ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_DEVICE_TYPE_KEY, msgBuffer, msgLength);
    console.log(
      'I1PRO3_DEVICE_TYPE_KEY:             ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(
      I1PRO3_MEASUREMENT_GEOMETRY_KEY,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_MEASUREMENT_GEOMETRY_KEY:    ' + msgBuffer.toString('utf-8')
    );
  } catch (error) {}
};

// set precision calibration to yes
const calibrateModes = () => {
  try {
    sEC = i1Pro3.setOption(I1PRO3_PRECISION_CALIBRATION_KEY, I1PRO3_YES);

    if (sEC != 0) {
      printErrorInfo();
    } else {
      isReadyForCalibration = true;
    }
  } catch (error) {
    isReadyForCalibration = false;
  }
};

// common helper function to wait for buttonPress and perform button press action
const performButtonPressed = () => {
  var buttonStatus = buttonType.e3ButtonNotPressed;
  var interval = setInterval(() => {
    buttonStatus = i1Pro3.getButtonStatus();
    if (buttonStatus == buttonType.e3ButtonIsPressed) {
      clearInterval(interval);
      buttonPressedAction();
    }
  }, 300);
};

const updateI1PRO3StartMeasure = (value) => {
  startMeasure = value;
};

const getI1PRO3MeasureStatus = () => {
  return startMeasure;
};

// common helper function to wait for buttonPress,
// passed callback function will be called after button pressed
const waitForButtonPressed = (callback) => {
  try {
    // flush last button status
    i1Pro3.getButtonStatus();

    startMeasure = true;

    var buttonStatus = buttonType.e3ButtonNotPressed;
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

      buttonStatus = i1Pro3.getButtonStatus();
      if (buttonStatus == buttonType.e3ButtonIsPressed) {
        startMeasure = false;
        const resMsg = {
          res: true,
          error: null,
        };
        callback(resMsg);
        clearInterval(measurementInterval);
        // clearMeasTimeout();
        // setMeasTimeout();
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

const setMeasTimeout = () => {
  // 5 mins timeout for measurement btn press

  measurementTimeout = setTimeout(() => {
    clearI1Pro3MeasurementInterval();
  }, 300000);
};

const clearMeasTimeout = () => {
  clearTimeout(measurementTimeout);
};

// to clear measurement interval
const clearI1Pro3MeasurementInterval = () => {
  clearInterval(measurementInterval);
  measurementInterval = null;
};

// on button pressed actions to be performed based on conditions
const buttonPressedAction = () => {
  if (isReadyForCalibration && !isCalibrationDone) {
    triggerCalibration();
    reflectanceSpot();
    performButtonPressed();
  } else if (isCalibrationDone && !isReadyForMeasurement) {
    reflectanceSpot();
    performButtonPressed();
  } else if (isCalibrationDone && isReadyForMeasurement) {
    try {
      triggerMeasurement();
      printMeasurementModeInfo();
      printSpectra();
      printSampleInLab();
      printSampleInRGB();
    } catch (error) {}
  }
};

// sets measurement mode to reflectance spot or m3 spot
const reflectanceSpot = () => {
  try {
    const mode = isM3Spot
      ? I1PRO3_REFLECTANCE_M3_SPOT
      : I1PRO3_REFLECTANCE_SPOT;

    sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE, mode);

    if (sEC != 0) {
      printDeviceInfo();
    } else {
      isReadyForMeasurement = true;
    }
  } catch (error) {
    isReadyForMeasurement = false;
  }
};

// prints measurementMode info
const printMeasurementModeInfo = () => {
  try {
    sEC = i1Pro3.getOption(I1PRO3_MEASUREMENT_MODE, msgBuffer, msgLength);

    sEC = i1Pro3.getOption(
      I1PRO3_TIME_SINCE_LAST_CALIBRATION,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_TIME_SINCE_LAST_CALIBRATION:   ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(
      I1PRO3_TIME_UNTIL_CALIBRATION_EXPIRE,
      msgBuffer,
      msgLength
    );
    console.log(
      'I1PRO3_TIME_UNTIL_CALIBRATION_EXPIRE: ' + msgBuffer.toString('utf-8')
    );
    sEC = i1Pro3.getOption(I1PRO3_MEASURE_COUNT, msgBuffer, msgLength);
    console.log(
      'I1PRO3_MEASURE_COUNT:                 ' + msgBuffer.toString('utf-8')
    );
  } catch (error) {}
};

// get measurement info
const getMeasurementInfo = () => {
  try {
    const measurementInfo = {};
    const measurementParams = [
      I1PRO3_MEASUREMENT_MODE,
      I1PRO3_RESULT_INDEX_KEY,
      COLOR_SPACE_KEY,
      OBSERVER_KEY,
      ILLUMINATION_KEY,
      I1PRO3_MEASURE_COUNT,
    ];
    measurementParams.forEach((name) => {
      let msgBuffer = new Buffer.alloc(256);
      msgBuffer.type = ref.types.char;
      let msgLength = new Buffer.alloc(4);
      msgLength.type = ref.types.uint32;
      msgLength.writeInt32LE(65000, 0);
      sEC = i1Pro3.getOption(name, msgBuffer, msgLength);
      const msg = msgBuffer.toString('utf-8');
      const index = msg.indexOf('\u0000');
      const actualMsg = index == -1 ? msg : msg.substring(0, index);
      measurementInfo[name] = actualMsg;
    });
    return measurementInfo;
  } catch (error) {
    return null;
  }
};

// get spectral data after measurement
const printSpectra = () => {
  try {
    msgBuffer.fill('');
    sEC = i1Pro3.getOption(
      I1PRO3_AVAILABLE_RESULT_INDEXES_KEY,
      msgBuffer,
      msgLength
    );

    let spectrum = new FloatArray(36);
    const indexesList = getActualMsgFromBuffer(msgBuffer).split(
      I1PRO3_VALUE_DELIMITER
    );

    const spectralData = {};

    // const indexesList = ["M1"];
    indexesList.forEach((indx) => {
      try {
        sEC = i1Pro3.setOption(I1PRO3_RESULT_INDEX_KEY, indx);
        console.log(
          '>>>> getSpectrum for spot measurement which uses zero index '
        );
        sEC = i1Pro3.getSpectrum(spectrum, 0);

        if (sEC != 0) {
          printErrorInfo();
        } else {
          spectralData[indx] = spectrum.toArray();
        }
      } catch (error) {}
    });
    return spectralData;
  } catch (error) {}
};

// get LAB data of measurement
const printSampleInLab = () => {
  try {
    sEC = i1Pro3.setOption(COLOR_SPACE_KEY, COLOR_SPACE_CIELab);

    return printTristimuli();
  } catch (error) {
    return null;
  }
};

// get RGB data of measurement
const printSampleInRGB = () => {
  try {
    sEC = i1Pro3.setOption(COLOR_SPACE_KEY, COLOR_SPACE_RGB);

    return printTristimuli();
  } catch (error) {
    return null;
  }
};

// get tristimulus data of measurement
const printTristimuli = () => {
  try {
    let tristimulus = new FloatArray(3);
    sEC = i1Pro3.getOption(COLOR_SPACE_KEY, msgBuffer, msgLength);
    msgBuffer.fill('');
    sEC = i1Pro3.getOption(
      I1PRO3_AVAILABLE_RESULT_INDEXES_KEY,
      msgBuffer,
      msgLength
    );
    const indexesList = getActualMsgFromBuffer(msgBuffer).split(
      I1PRO3_VALUE_DELIMITER
    );
    // const indexesList = ["M1"];
    const triStimulusData = {};
    indexesList.forEach((indx) => {
      try {
        sEC = i1Pro3.setOption(I1PRO3_RESULT_INDEX_KEY, indx);

        sEC = i1Pro3.getTriStimulus(tristimulus, 0);

        tristimulus[indx] = tristimulus.toArray();
        //return tristimulus.toArray();
      } catch (error) {}
    });
    if (sEC != 0) {
      printErrorInfo();
      return null;
    }
    return triStimulusData;
  } catch (error) {
    return null;
  }
};

// get clear msg from buffer except x00
const getActualMsgFromBuffer = (msgBuffer) => {
  const msg = msgBuffer.toString('utf-8');
  const index = msg.indexOf('\u0000');
  const actualMsg = index == -1 ? msg : msg.substring(0, index);
  return actualMsg;
};

// sets calibration options before calibrating
const triggerCalibration = () => {
  try {
    let mode = isM3Spot ? I1PRO3_REFLECTANCE_M3_SPOT : I1PRO3_REFLECTANCE_SPOT;

    sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE, mode);
    sEC = isM3Spot
      ? i1Pro3.calibrateReflectanceM3Mode()
      : i1Pro3.calibrateReflectanceMode();

    if (sEC != 0) {
      printErrorInfo();
    } else {
      isCalibrationDone = true;
    }
  } catch (error) {}
};

// sets measurement conditions before measurement
const setMeasurementCondition = () => {
  try {
    sEC = i1Pro3.setOption(
      I1PRO3_RESULT_INDEX_KEY,
      I1PRO3_ILLUMINATION_CONDITION_M0
    );
    sEC = i1Pro3.setOption(I1PRO3_NUMBER_OF_PATCHES_PER_LINE, '10');

    if (sEC != 0) {
      printErrorInfo();
    }
  } catch (error) {}
};

// sets current Spot Mode
const setIsM3SpotMode = (value) => {
  isM3Spot = value;
};

// prints last error info
const printErrorInfo = () => {
  try {
    i1Pro3.getGlobalOption(I1PRO3_LAST_ERROR_TEXT, msgBuffer, msgLength);

    const msg = getActualMsgFromBuffer(msgBuffer);
    i1Pro3.getGlobalOption(I1PRO3_LAST_ERROR_NUMBER, msgBuffer, msgLength);

    const msgNo = getActualMsgFromBuffer(msgBuffer);

    return { errorNo: msgNo, message: msg };
  } catch (error) {
    return { errorNo: null, message: error?.message };
  }
};

// websocket functions
const setOptions = (options) => {
  try {
    for (const key in options) {
      sEC = i1Pro3.setOption(key, options[key]);

      if (sEC != 0) {
        printErrorInfo();
        throw new Error('setting Options failed');
      }
    }

    return true;
  } catch (error) {
    return false;
  }
};

// sets all device options from odoo
const setDeviceOptions = (options) => {
  const preM3spot = isM3Spot;
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
        if (options[key] == 'M3') {
          sEC = i1Pro3.setOption(
            I1PRO3_MEASUREMENT_MODE,
            I1PRO3_REFLECTANCE_M3_SPOT
          );
          printErrorInfo();
        } else {
          sEC = i1Pro3.setOption(
            I1PRO3_MEASUREMENT_MODE,
            I1PRO3_REFLECTANCE_SPOT
          );
          printErrorInfo();
        }
      }

      sEC = i1Pro3.setOption(key, options[key]);
    }
    if (sEC != 0) {
      printErrorInfo();
      return false;
    }
    isM3Spot = options[I1PRO3_MEASUREMENT_MODE] == I1PRO3_REFLECTANCE_M3_SPOT;
    return true;
  } catch (error) {
    isM3Spot = preM3spot;

    return false;
  }
};

// sets all device options for Strip Measurement
const setDeviceOptionsStripMode = (options) => {
  const preM3spot = isM3Spot;
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
        if (resultIndexKey == M0_M1_M2) {
          sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE, I1PRO3_REFLECTANCE_SCAN);
          if (sEC != 0) {
            printErrorInfo();
            return false;
          }
          continue;
        }
        if (options[key] == 'M3') {
          sEC = i1Pro3.setOption(
            I1PRO3_MEASUREMENT_MODE,
            I1PRO3_REFLECTANCE_M3_SCAN
          );
          printErrorInfo();
        } else {
          sEC = i1Pro3.setOption(
            I1PRO3_MEASUREMENT_MODE,
            I1PRO3_REFLECTANCE_SCAN
          );
          printErrorInfo();
        }
      }

      sEC = i1Pro3.setOption(key, options[key]);
    }
    if (sEC != 0) {
      printErrorInfo();
      return false;
    }
    isM3Spot = options[I1PRO3_MEASUREMENT_MODE] == I1PRO3_REFLECTANCE_M3_SCAN;
    return true;
  } catch (error) {
    isM3Spot = preM3spot;

    return false;
  }
};

// performs calibration based on condition
const calibrateDevice = () => {
  try {
    if (isM3Spot) {
      sEC = i1Pro3.calibrateReflectanceM3Mode();
    } else {
      sEC = i1Pro3.calibrateReflectanceMode();
    }
    if (sEC != 0) {
      printErrorInfo();
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// performs calibration based on condition for i1Pro3StripMode
const calibrateDeviceStripMode = () => {
  try {
    sEC = i1Pro3.setOption(I1PRO3_PRECISION_CALIBRATION_KEY, I1PRO3_YES);
    console.log({ setCalibrationKey: sEC });

    sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE, I1PRO3_REFLECTANCE_SCAN);
    console.log({ setReflectanceMode: sEC });

    console.log({isM3Spot});
    if (sEC != 0) {
      printErrorInfo();
      return false;
    }
    if (isM3Spot) {
      sEC = i1Pro3.calibrateReflectanceM3Mode();
    } else {
      // sEC = i1Pro3.calibrateReflectanceMode();
      sEC = i1Pro3.calibrateDevice();
      console.log('Calibrate Device');
      console.log({sEC});
    }
    if (sEC != 0) {
      printErrorInfo();
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
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

const getAvgOfSingleResultKeyMeasurementOld = () => {
  try {
    const spectrumDatas = [];
    const LABDatas = [];
    const RGBDatas = [];
    const avgSpectumData = [];
    const avgLABData = [];
    const avgRGBData = [];
    for (let i = 0; i < measAvgNum; i++) {
      const res = triggerMeasurement();
      if (res) {
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        spectrumDatas[i] = getSpectrumResult();

        LABDatas[i] = getLABResult();

        RGBDatas[i] = getRGBResult();
      } else {
        const error = printErrorInfo();
        return { res: false, error };
      }
    }

    for (let i = 0; i < spectrumDatas[0].length; i++) {
      avgSpectumData[i] = 0;
      for (let j = 0; j < measAvgNum; j++) {
        avgSpectumData[i] = avgSpectumData[i] + spectrumDatas[j][i];
      }
      avgSpectumData[i] = avgSpectumData[i] / measAvgNum;
    }
    const spectrumData = getSpectrumResult();
    const LABData = getLABResult();
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
      const res = triggerMeasurement();
      if (res) {
        const M0MeasData = getIndexKeyMeasurementData(
          I1PRO3_ILLUMINATION_CONDITION_M0
        );
        const M1MeasData = getIndexKeyMeasurementData(
          I1PRO3_ILLUMINATION_CONDITION_M1
        );
        const M2MeasData = getIndexKeyMeasurementData(
          I1PRO3_ILLUMINATION_CONDITION_M2
        );
        //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
        M0SpectrumData[i] = M0MeasData.measData.spectrumData;
        M1SpectrumData[i] = M1MeasData.measData.spectrumData;
        M2SpectrumData[i] = M2MeasData.measData.spectrumData;
        M0LABData = M0MeasData.measData.LABData;
        M1LABData = M1MeasData.measData.LABData;
        M2LABData = M2MeasData.measData.LABData;
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

const triggerAvgMeasurementOld = () => {
  if (resultIndexKey == M0_M1_M2) {
    return getAvgOfAllResultKeyMeasurement();
  }
  return getAvgOfSingleResultKeyMeasurement();
};

const waitForButtonPressPromise = () =>
  new Promise((resolve) => waitForButtonPressed((res) => resolve(res)));

const getAvgOfSingleResultKeyMeasurement = async () => {
  try {
    let spectrumData = [];
    let LABData = [];
    let avgSpectrumData = [];
    let avgLABData = [];
    for (let i = 0; i < measAvgNum; i++) {
      const buttonPressRes = await waitForButtonPressPromise();
      if (buttonPressRes.res) {
        const res = triggerMeasurement();
        if (res) {
          //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
          spectrumData[i] = getSpectrumResult();
          LABData[i] = getLABResult();
        } else {
          const error = printErrorInfo();
          return { res: false, error };
        }
      } else {
        return { res: false, error: { message: buttonPressRes?.error } };
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

const getIndexKeyMeasurementData = (indexKey) => {
  try {
    sEC = i1Pro3.setOption(I1PRO3_RESULT_INDEX_KEY, indexKey);
    if (sEC != 0) {
      const error = printErrorInfo();
      return { res: false, error: error.message };
    }
    const LABData = getLABResult();
    const spectrumData = getSpectrumResult();
    if (LABData && spectrumData) {
      return { res: true, measData: { spectrumData, LABData }, error: null };
    }
    const error = printErrorInfo();
    return { res: false, error: error.message };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

const getIndexKeyMeasurementDataStripMode = (indexKey,index) => {
  try {
    sEC = i1Pro3.setOption(I1PRO3_RESULT_INDEX_KEY, indexKey);
    console.log('I1PRO3_RESULT_INDEX_KEY', indexKey, index);
    console.log({ sEC });
    if (sEC != 0) {
      const error = printErrorInfo();
      return { res: false, error: error.message };
    }
    const LABData = getLABResultByIndex(index);
    const spectrumData = getSpectrumResultByIndex(index);
    console.log({LABData});
    console.log({spectrumData});
    if (LABData && spectrumData) {
      return { res: true, measData: { spectrumData, LABData }, error: null };
    }
    const error = printErrorInfo();
    return { res: false, error: error.message };
  } catch (error) {
    return { res: false, error: error.message };
  }
};

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
        const res = triggerMeasurement();
        if (res) {
          const M0MeasData = getIndexKeyMeasurementData(
            I1PRO3_ILLUMINATION_CONDITION_M0
          );
          const M1MeasData = getIndexKeyMeasurementData(
            I1PRO3_ILLUMINATION_CONDITION_M1
          );
          const M2MeasData = getIndexKeyMeasurementData(
            I1PRO3_ILLUMINATION_CONDITION_M2
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

const triggerAvgMeasurement = async () => {
  if (resultIndexKey == M0_M1_M2) {
    return await getAvgOfAllResultKeyMeasurement();
  }
  return await getAvgOfSingleResultKeyMeasurement();
};

const triggerAvgMeasurementStripMode = async (numOfPatches) => {
  if (resultIndexKey == M0_M1_M2) {
    return await getAvgOfAllResultKeyMeasurementStripMode(numOfPatches);
  }
  return await getAvgOfSingleResultKeyMeasurement();
};

const getAvgOfAllResultKeyMeasurementStripMode = async (numOfPatches) => {
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
      let M0SpectrumDataObj = {};
      let M1SpectrumDataObj = {};
      let M2SpectrumDataObj = {};
      let M0LABDataObj = {};
      let M1LABDataObj = {};
      let M2LABDataObj = {};

      // sEC = i1Pro3.calibrateDevice();
      // console.log({ calibrateDevice: sEC });
      console.log('Measurement Call');
      calibrateDeviceStripMode();

      sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE, I1PRO3_REFLECTANCE_SCAN);
      console.log({ setReflectanceMode: sEC });

      // recognize patches in SDK.
      // sEC = i1Pro3.setOption(I1PRO3_PATCH_RECOGNITION_KEY, I1PRO3_PATCH_RECOGNITION_POSITION_DARK);
      // console.log({ recognitionPatch: sEC });

      // sEC = i1Pro3.setOption(I1PRO3_NUMBER_OF_PATCHES_PER_LINE, numOfPatches.toString());
      // console.log({ setNoOfPatches: sEC });

      // recognize patches in SDK.
      sEC = i1Pro3.setOption(I1PRO3_PATCH_RECOGNITION_KEY, I1PRO3_PATCH_RECOGNITION_POSITION_DARK);
      console.log({ recognitionPatch: sEC });

      sEC = i1Pro3.setOption(I1PRO3_NUMBER_OF_PATCHES_PER_LINE, '16');
      console.log({ setNoOfPatches: sEC });

      const BeforeSamples = i1Pro3.getNumberOfAvailableSamples();
      console.log({ BeforeSamples });
      console.log("waiting for button press ...");

      const buttonPressRes = await waitForButtonPressPromise();
      console.log({ buttonPressRes });

      if (buttonPressRes.res) {
        const res = triggerMeasurement();
        console.log({ res });
        if (res) {
          for (let i = 0; i < numOfPatches; i++) {
            const M0MeasData = getIndexKeyMeasurementDataStripMode(I1PRO3_ILLUMINATION_CONDITION_M0,i);
            const M1MeasData = getIndexKeyMeasurementDataStripMode(I1PRO3_ILLUMINATION_CONDITION_M1,i);
            const M2MeasData = getIndexKeyMeasurementDataStripMode(I1PRO3_ILLUMINATION_CONDITION_M2,i);
            //get result from calling printSpectra(), printSampleInRGB(), printSampleInLAB()
            // M0SpectrumData[i] = M0MeasData.measData.spectrumData;
            // M1SpectrumData[i] = M1MeasData.measData.spectrumData;
            // M2SpectrumData[i] = M2MeasData.measData.spectrumData;
            // M0LABData[i] = M0MeasData.measData.LABData;
            // M1LABData[i] = M1MeasData.measData.LABData;
            // M2LABData[i] = M2MeasData.measData.LABData;
            M0SpectrumData.push(M0MeasData.measData.spectrumData);
            M1SpectrumData.push(M1MeasData.measData.spectrumData);
            M2SpectrumData.push(M2MeasData.measData.spectrumData);
            M0LABData.push(M0MeasData.measData.LABData);
            M1LABData.push(M1MeasData.measData.LABData);
            M2LABData.push(M2MeasData.measData.LABData);
          }
        } else {
          const error = printErrorInfo();
          return { res: false, error };
        }
      } else {
        return { res: false, error: { message: buttonPressRes.error } };
      }

    // avgM0SpectrumData = getAverageData(M0SpectrumData, measAvgNum);
    // avgM1SpectrumData = getAverageData(M1SpectrumData, measAvgNum);
    // avgM2SpectrumData = getAverageData(M2SpectrumData, measAvgNum);
    // avgM0LABData = getAverageData(M0LABData, measAvgNum);
    // avgM1LABData = getAverageData(M1LABData, measAvgNum);
    // avgM2LABData = getAverageData(M2LABData, measAvgNum);
    for (let j = 0; j < numOfPatches; j++) {
      M0SpectrumDataObj[j.toString()] = M0SpectrumData[j];
      M1SpectrumDataObj[j.toString()] = M1SpectrumData[j];
      M2SpectrumDataObj[j.toString()] = M2SpectrumData[j];
      M0LABDataObj[j.toString()] = M0LABData[j];
      M1LABDataObj[j.toString()] = M1LABData[j];
      M2LABDataObj[j.toString()] = M2LABData[j];
    }

    return {
      res: true,
      measData: {
        M0SpectrumData: M0SpectrumDataObj,
        M1SpectrumData: M1SpectrumDataObj,
        M2SpectrumData: M2SpectrumDataObj,
        M0LABData: M0LABDataObj,
        M1LABData: M1LABDataObj,
        M2LABData: M2LABDataObj,
      },
    };
  } catch (error) {
    return { res: false, error: { message: error?.message } };
  }
};

// performs measurement
const triggerMeasurement = () => {
  try {
    sEC = i1Pro3.triggerMeasurement();
    console.log({ triggerMeasurement : sEC});

    if (sEC != 0) {
      printErrorInfo();
      return false;
    } else {
      return true;
    }
  } catch (error) {
    return false;
  }
};

// get Spectrum data of last measurement
const getSpectrumResult = () => {
  try {
    let spectrum = new FloatArray(36);
    sEC = i1Pro3.getSpectrum(spectrum, 0);

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

// get Spectrum data of index measurement
const getSpectrumResultByIndex = (index) => {
  try {
    let spectrum = new FloatArray(36);
    sEC = i1Pro3.getSpectrum(spectrum, index);

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
const getTriStimulusResult = () => {
  try {
    let tristimulus = new FloatArray(3);
    sEC = i1Pro3.getTriStimulus(tristimulus, 0);

    if (sEC != 0) {
      printErrorInfo();
      return null;
    }
    return tristimulus.toArray();
  } catch (error) {
    return null;
  }
};

// get TriStimulus data of index measurement
const getTriStimulusResultByIndex = (index) => {
  try {
    let tristimulus = new FloatArray(3);
    sEC = i1Pro3.getTriStimulus(tristimulus, index);

    if (sEC != 0) {
      printErrorInfo();
      return null;
    }
    return tristimulus.toArray();
  } catch (error) {
    return null;
  }
};

// get LAB data of last measurement
const getLABResult = () => {
  try {
    sEC = i1Pro3.setOption(COLOR_SPACE_KEY, COLOR_SPACE_CIELab);

    return getTriStimulusResult();
  } catch (error) {
    return null;
  }
};

// get LAB data of index measurement
const getLABResultByIndex = (index) => {
  try {
    sEC = i1Pro3.setOption(COLOR_SPACE_KEY, COLOR_SPACE_CIELab);

    return getTriStimulusResultByIndex(index);
  } catch (error) {
    return null;
  }
};

// get RGB data of last measurement
const getRGBResult = () => {
  try {
    sEC = i1Pro3.setOption(COLOR_SPACE_KEY, COLOR_SPACE_RGB);

    return getTriStimulusResult();
  } catch (error) {
    return null;
  }
};

const test = () => {
  loadI1PRO3LibraryFunctions();
  const isOpen = i1Pro3.openDevice();
  console.log({ isOpen });
  console.log({ erro: printErrorInfo() });
  //const calRes = triggerCalibration();
  // ['A','B','C','D50','D55','D65','D75','F2','F7','F11'].forEach(x=>{
  //   console.log('setting..'+ x);
  //   sEC = i1Pro3.setOption('Colorimetric.Illumination',x);
  //   if(sEC !=0) printErrorInfo();
  // });
  // ['DIN','DINNB','ANSIA','ANSIE','ANSII','ANSIT','SPI'].forEach(x=>{
  //   console.log('setting..'+ x);
  //   sEC = i1Pro3.setOption('Colorimetric.DensityStandard',x);
  //   if(sEC !=0) printErrorInfo();
  // });
  // ['TwoDegree','TenDegree'].forEach(x=>{
  //   console.log('setting..'+ x);
  //   sEC = i1Pro3.setOption('Colorimetric.Observer',x);
  //   if(sEC !=0) printErrorInfo();
  // });
  // sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE,I1PRO3_REFLECTANCE_SPOT);
  // console.log({sEC});
  // printErrorInfo();
  // sEC = i1Pro3.setOption(I1PRO3_MEASUREMENT_MODE,I1PRO3_REFLECTANCE_M3_SPOT);
  // console.log({sEC});
  // printErrorInfo();
  //measAvgNum = 3;
  //const measRes = triggerAvgMeasurement();
  //console.log({ measRes });
};

//test();

module.exports = {
  loadI1PRO3LibraryFunctions,
  getSDKVersion,
  openDevice,
  printDeviceInfo,
  calibrateModes,
  performButtonPressed,
  waitForButtonPressed,
  reflectanceSpot,
  printMeasurementModeInfo,
  getMeasurementInfo,
  printSpectra,
  printSampleInLab,
  printSampleInRGB,
  triggerCalibration,
  setMeasurementCondition,
  setIsM3SpotMode,
  setDeviceOptions,
  calibrateDevice,
  calibrateDeviceStripMode,
  triggerMeasurement,
  triggerAvgMeasurementStripMode,
  getSpectrumResult,
  getLABResult,
  getRGBResult,
  printErrorInfo,
  getI1Pro3SerialNumber,
  getI1Pro3BasicDeviceInfo,
  triggerAvgMeasurement,
  clearI1Pro3MeasurementInterval,
  updateI1PRO3StartMeasure,
  getI1PRO3MeasureStatus,
  setDeviceOptionsStripMode
};
