const device = {
  deviceInUse: false,
  deviceType: null,
  deviceName: null,
};

const auth = {
  username: null,
  isElectron: true,
  id: null,
  instanceURL: null,
};

const connection = {
  type: 'connection',
  connection: {
    isConnected: false,
    mySocketKey: null,
    isVerified: false,
    forceConnect: false,
  },
};

const deviceConnection = {
  type: 'deviceConnection',
  deviceConnection: {
    deviceType: null,
    deviceName: null,
    isConnected: false,
  },
};

const disconnectDevice = {
  type: 'disconnectDevice',
  disconnectDevice: {
    deviceType: null,
    deviceName: null,
    deviceDisconnected: false,
  },
};

const settings = {
  type: 'settings',
  settings: { options: {}, isSet: false }, // options : { 'illumination' : 'M1',... }
};

const calibration = {
  type: 'calibration',
  calibration: { hasCalibrated: false },
};

const measurement = {
  type: 'measurement',
  measurement: { hasMeasured: false, measurementData: {} }, //measurementData can be anything
};

const disconnection = {
  type: 'disconnection',
  connection: { isConnected: true },
};

const chartPosition = {
  type: 'chartPosition',
  chartPosition: { position: '', hasTaken: false, error: null },
};

const scanMeasurement = {
  type: 'measurement',
  measurement: {
    hasMeasured: false,
    measurementData: 'filebuffer',
    error: null,
  },
  chartInfo: {
    column: 12,
    row: 12,
    patchGap: 0.8,
    patchesToIgnoreInLastRow: 12,
  },
};

const updateAvailableDevice = {
  type: 'updateAvailableDevice',
  deviceId: null,
  deviceType: null,
  deviceName: null,
  serialNumber: null,
  isReconnect: false,
};

const removeAvailableDevice = {
  type: 'removeAvailableDevice',
  deviceId: null,
  deviceType: null,
  deviceName: null,
  serialNumber: null,
};

const resetConnectionObj = () => {
  connection.connection.isConnected = false;
  connection.connection.isVerified = false;
};

const pbWeightMeasurement = {
  type: 'pb_weight',
  pb_weight_data: { is_weight: false, weightData: {} }, //weightData can be anything
};

const pbMakeResetDevice = {
  type: 'pb_resetData',
  pb_reset_data: { is_reset: false, is_setWorkingMode: false, resetData: {} }, //resetData can be anything
  pb_threshold_data: { is_set_threshold: false, lower_threshold_value: {}, upper_threshold_value: {} }, //resetData can be anything
};

const pbGetTareValue = {
  type: 'pb_get_tare_value',
  pb_tare_data: { is_tare: false, tare_value: {}, error: null },
};

const pbSetTareValue = {
  type: 'pb_set_tare_value',
  pb_tare_data: { is_set_tare: false, tare_value_colorportal: {}, error: null },
};

const barCodeDataObj = {
  type: 'handle_barcode_reader',
  barCode_data: { isReaded: false, error: null}
};
const zebraPrinterDataObj = {
  type: 'zebra_label_printer',
  zebra_data: { isPrinted: false}
};


module.exports = {
  auth,
  connection,
  settings,
  calibration,
  measurement,
  disconnection,
  deviceConnection,
  disconnectDevice,
  device,
  updateAvailableDevice,
  removeAvailableDevice,
  resetConnectionObj,
  chartPosition,
  scanMeasurement,
  pbWeightMeasurement,
  pbMakeResetDevice,
  pbGetTareValue,
  pbSetTareValue,
  barCodeDataObj,
  zebraPrinterDataObj
};
