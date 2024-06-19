const path = require('path');
const { encJObj, decJObj } = require('./crypto');
const {
  auth,
  connection,
  settings,
  calibration,
  measurement,
  deviceConnection,
  device,
  updateAvailableDevice,
  removeAvailableDevice,
  disconnectDevice,
  resetConnectionObj,
  pbWeightMeasurement,
  pbMakeResetDevice,
  pbSetTareValue,
  pbGetTareValue,
  barCodeDataObj,
  zebraPrinterDataObj,
} = require('./data');
const {
  ipcLog,
  ipcConnectionStatus,
  ipcCurrentAction,
  ipcSettings,
  ipcCalibration,
  onSettings,
  onCalibration,
  onMeasurement,
  onWeightMeasurement,
  ipcMeasurement,
  onConnectSocket,
  onDisconnectSocket,
  ipcDeviceConnection,
  onDeviceConnection,
  onVerifyDeviceConnection,
  ipcShowDialog,
  onDisconnectDevice,
  ipcSocketConnection,
  ipcSocketDisconnectCleanly,
  onDeviceReconnection,
  ipcClientSocketAlreadyExist,
  ipcDeviceDisconnection,
  onDisconnectDeviceFromServer,
  onColorGateAPIReq,
  ipcSendColorGateAPIReq,
  onColorGateAPIRes,
  onColorGateServerConnectionReq,
  ipcColorGateServerConnectionRes,
  ipcColorGateConnectionCheck,
  onColorGateConnectionCheck,
  onColorGateUpdateLicense,
  onAlwanAPIReq,
  onAlwanAPIRes,
  ipcSendAlwanAPIReq,
  ipcAlwanConnectionCheck,
  ipcAlwanServerConnectionRes,
  onAlwanServerConnectionReq,
  onAlwanConnectionCheck,
  onAlwanUpdateLicense,
  ipcChartPosition,
  onChartPosition,
  ipcGrabInitialPosition,
  onGrabInitialPosition,
  ipcWeightMeasurement,
  ipcMakeResetDevice,
  onMakeResetDevice,
  onGetTareValue,
  ipcGetTareValue,
  ipcSetTareValue,
  onSetTareValue,
  ipcSendToZebraHandler,
  ipcSendToBarcodeReader,
  onBarCodeReader,
  onZebraPrinterHandler,
  onChnageConnectionType
} = require('./ipcRendererCall');

let socket = null;
let colorGateSocketConnection = false;
let alwanSocketConnection = false;
let availableDevice = [];
let forceConnect = undefined;
let clientAlreadyAvailable = false;
let dummyInterval = null;
const fs = window.require('fs');
const connectSocket = (url, auth) => {
  console.log('url', url)
  console.log('auth', auth)
  if (socket) return;
  clientAlreadyAvailable = false;
  const config = {
    headers: {
      username: auth.username,
      instance_url: auth.instanceURL,
      token: auth.token,
    },
  };
  console.log('config', config)
  socket = new WebSocket(url);
  socket.onopen = () => {
    ipcSocketConnection(true);
    ipcConnectionStatus('connected');
    ipcCurrentAction('connected');
  };

  socket.onmessage = ({ data }) => {
    try {
      const res = JSON.parse(data);
      if (res?.error) {
        ipcCurrentAction(res.error);
        ipcShowDialog('Error', res.error ?? 'Unknown Error');
        return;
      }
    } catch (error) {}
    const decRes = decryptMsg(socket, data);
    if (
      decRes.message?.error?.message &&
      decRes.message?.error?.message ==
        'Requested CMA-connect client is already available'
    ) {
      clientAlreadyAvailable = true;
      ipcClientSocketAlreadyExist(true);
    }
    if (!decRes.success) return;
    handleResponse(decRes.message);
  };

  socket.onerror = (error) => {
    socket = null;
    colorGateSocketConnection = false;
    alwanSocketConnection = false;
    resetConnectionObj();
    if (clientAlreadyAvailable) return;
    ipcConnectionStatus('disconnected');
    ipcCurrentAction('error occurred !!');
    ipcSocketConnection(false);
  };

  socket.onclose = (event) => {
    socket = null;
    colorGateSocketConnection = false;
    alwanSocketConnection = false;
    resetConnectionObj();
    if (event.reason == 'client already exist') {
      clientAlreadyAvailable = true;
      ipcClientSocketAlreadyExist(true);
    } else {
      clientAlreadyAvailable = false;
      ipcClientSocketAlreadyExist(false);
    }
    if (clientAlreadyAvailable) return;
    ipcConnectionStatus('disconnected');
    ipcCurrentAction('disconnected');
    ipcSocketConnection(false);
    resetDevice();
  };
};

const handleResponse = (msg) => {
  if (msg?.error) {
    ipcCurrentAction(msg.error?.message);
    ipcShowDialog('Error', msg.error?.message ?? 'Unknown Error');
    return;
  }
  switch (msg?.type) {
    case 'connection':
      handleConnectionResponse(msg);
      break;

    case 'deviceConnection':
      handleDeviceConnectionResponse(msg);
      break;

    case 'settings':
      handleSettingsResponse(msg);
      break;

    case 'calibration':
      handleCalibrationResponse(msg);
      break;

    case 'measurement':
      handleMeasurementResponse(msg);
      break;

    case 'disconnection':
      handleDisconnectionResponse(msg);
      break;

    case 'disconnectDevice':
      handleDisconnectDeviceResponse(msg);
      break;

    case 'colorGateAPI':
      handleColorGateAPIRequest(msg);
      break;

    case 'alwanAPI':
      handleAlwanAPIRequest(msg);
      break;

    case 'colorGateServerConnection':
      handleColorGateServerConnectionResponse(msg);
      break;

    case 'alwanServerConnection':
      handleAlwanServerConnectionResponse(msg);
      break;

    case 'colorGateConnectionCheck':
      handleColorGateConnectionCheck(msg);
      break;

    case 'alwanConnectionCheck':
      handleAlwanConnectionCheck(msg);
      break;

    case 'grabInitialPosition':
      handleGrabInitialPosition(msg);
      break;

    case 'chartPosition':
      handleChartPosition(msg);
      break;

    case 'pb_weight':
      handleWeightResponse(msg);
      break;

    case 'pb_resetData':
      handleResetDataForPB(msg);
      break;

    case 'pb_get_tare_value':
      handleGetTareValue(msg);
      break;

    case 'pb_set_tare_value':
      handleSetTareValue(msg);
      break;

    case 'zebra_label_printer':
      handleZebraPrinter(msg);
      break;

    case 'handle_barcode_reader':
      handleBarcodeReader(msg);
      break;

    default:
      break;
  }
};

const handleConnectionResponse = (msg) => {
  if (msg.connection.isConnected && !msg.connection?.isVerified) {
    ipcCurrentAction('verifying');
    auth.id = msg.connection.id;
    connection.connection.isConnected = true;
    const obj = { auth, content: connection };
    // socket.send(encJObj(obj));
    sendEncryptMsg(socket, obj);
  }
  if (msg.connection.isConnected && msg.connection.isVerified) {
    connection.connection.isVerified = true;
    ipcCurrentAction('verified');
  }
};

const handleDeviceConnectionResponse = (msg) => {
  if (!availableDevice.includes(msg.deviceConnection.deviceType) && (!availableDevice.includes(String(msg.deviceConnection.deviceType).split('_')[0]))) {
    const obj = { auth, content: msg };
    obj.content.error = { message: 'Requested device is not available' };
    sendEncryptMsg(socket, obj);
  } else {
    ipcCurrentAction(`setting device ${msg.deviceConnection.deviceName}`);
    device.deviceInUse = true;
    device.deviceType = msg.deviceConnection.deviceType;
    device.deviceName = msg.deviceConnection.deviceName;
    ipcDeviceConnection(msg);
  }
};

const handleDisconnectDeviceResponse = (msg) => {
  ipcCurrentAction(`${msg.disconnectDevice.deviceName} disconnected`);
  device.deviceInUse = false;
  device.deviceType = null;
  device.deviceName = null;
  msg.disconnectDevice.deviceDisconnected = true;
  ipcDeviceDisconnection(true);
};

const handleSettingsResponse = (msg) => {
  ipcCurrentAction('setting options...');
  ipcSettings(msg); //calling main process to set options on device
};

const handleCalibrationResponse = (msg) => {
  ipcCurrentAction('calibrating...');
  ipcCalibration(msg); //calling main process to perform calibration on device
};

const handleMeasurementResponse = (msg) => {
  ipcCurrentAction('taking measurement...');
  ipcMeasurement(msg); //calling main process to perform measurement on device
};

const handleWeightResponse = (msg) => {
  ipcCurrentAction('taking Weighting...');
  ipcWeightMeasurement(msg); //calling main process to perform measurement on device
};

const handleResetDataForPB = (msg) => {
  ipcCurrentAction('taking Reseting (Make Zero)...');
  ipcMakeResetDevice(msg);
};

const handleGetTareValue = (msg) => {
  ipcCurrentAction('tareing value........');
  ipcGetTareValue(msg);
};

const handleSetTareValue = (msg) => {
  ipcCurrentAction('tareing value........');
  ipcSetTareValue(msg);
};

const handleZebraPrinter = (msg) => {
  ipcCurrentAction('handle Zebra Printer........');
  ipcSendToZebraHandler(msg);
};

const handleBarcodeReader = (msg) => {
  ipcCurrentAction('handle barcode reader........');
  ipcSendToBarcodeReader(msg);
};

const handleDisconnectionResponse = (msg) => {
  ipcCurrentAction('disconnecting..');
  setTimeout(() => {
    socket.close();
    ipcCurrentAction('disconnected');
    ipcConnectionStatus('disconnected');
  }, 2000);
};

const handleColorGateConnectionCheck = (msg) => {
  ipcColorGateConnectionCheck(msg);
};

const handleAlwanConnectionCheck = (msg) => {
  ipcAlwanConnectionCheck(msg);
};

// function for scanning
const handleChartPosition = (msg) => {
  ipcChartPosition(msg);
};

const handleGrabInitialPosition = (msg) => {
  ipcGrabInitialPosition(msg);
};

onConnectSocket(
  (event, { username, instanceURL, token, socketURL, forceConnect }) => {
    console.log( { username, instanceURL, token, socketURL, forceConnect });
    connection.connection.forceConnect = forceConnect;
    connectSocket(socketURL, { username, instanceURL, token });
    auth.username = username;
    auth.instanceURL = instanceURL;
  }
);

onDisconnectSocket((event) => {
  socket.close();
});

//on ipcRenderer handling to send successful result to be sent to server
//ipcMain send msg after handling i1Pro3 functions and that will be listened here

onVerifyDeviceConnection((event, args) => {
  const { device, serialNumber } = args;
  availableDevice.push(device.deviceType);
  updateAvailableDevice.deviceType = device.deviceType;
  updateAvailableDevice.deviceName = device.deviceType;
  updateAvailableDevice.deviceId = device.deviceId;
  updateAvailableDevice.serialNumber = serialNumber;
  const obj = { auth, content: updateAvailableDevice };
  sendEncryptMsg(socket, obj);
});

onDeviceReconnection((event, args) => {
  const { device, serialNumber } = args;
  availableDevice.push(device.deviceType);
  updateAvailableDevice.deviceType = device.deviceType;
  updateAvailableDevice.deviceName = device.deviceType;
  updateAvailableDevice.deviceId = device.deviceId;
  updateAvailableDevice.serialNumber = serialNumber;
  // updateAvailableDevice.isReconnect = true;
  const content = { ...updateAvailableDevice, isReconnect: true };
  const obj = { auth, content: content };
  sendEncryptMsg(socket, obj);
});

onDisconnectDevice((event, args) => {
  availableDevice = availableDevice.filter((x) => {
    return !(x == args.deviceType);
  });
  removeAvailableDevice.deviceType = args.deviceType;
  removeAvailableDevice.deviceName = args.deviceType;
  removeAvailableDevice.deviceId = args.deviceId;
  removeAvailableDevice.serialNumber = updateAvailableDevice.serialNumber;
  const obj = { auth, content: removeAvailableDevice };
  updateAvailableDevice.deviceType = null;
  updateAvailableDevice.deviceName = null;
  updateAvailableDevice.deviceId = null;
  updateAvailableDevice.serialNumber = null;
  sendEncryptMsg(socket, obj);
});

onDeviceConnection((event, deviceConnectObj) => {
  if (deviceConnectObj.deviceConnection.isConnected) {
    deviceConnection.deviceConnection = deviceConnectObj.deviceConnection;
  } else {
    device.deviceInUse = false;
    device.deviceType = null;
    device.deviceName = null;
  }
  const obj = { auth, content: deviceConnectObj };
  sendEncryptMsg(socket, obj);
});

onSettings((event, settingObj) => {
  settings.settings = settingObj.settings;
  const obj = { auth, content: settingObj };
  sendEncryptMsg(socket, obj);
});

onCalibration((event, calibrationObj) => {
  calibration.calibration = calibrationObj.calibration;
  const obj = { auth, content: calibrationObj };
  sendEncryptMsg(socket, obj);
});

onMeasurement((event, measurementObj) => {
  measurement.measurement = measurementObj.measurement;
  const obj = { auth, content: measurementObj };
  sendEncryptMsg(socket, obj);
});

onWeightMeasurement((event, weightDataObj) => {
  pbWeightMeasurement.pb_weight_data = weightDataObj.pb_weight_data;
  const obj = { auth, content: weightDataObj };
  sendEncryptMsg(socket, obj);
});

onMakeResetDevice((event, resetDataObj) => {
  pbMakeResetDevice.pb_reset_data = resetDataObj.pb_reset_data;
  const obj = { auth, content: resetDataObj };
  sendEncryptMsg(socket, obj);
});

onGetTareValue((event, tareDataObj) => {
  pbGetTareValue.pb_tare_data = tareDataObj.pb_tare_data;
  const obj = { auth, content: tareDataObj };
  sendEncryptMsg(socket, obj);
});

onSetTareValue((event, tareDataObj) => {
  pbSetTareValue.pb_tare_data = tareDataObj.pb_tare_data;
  const obj = { auth, content: tareDataObj };
  sendEncryptMsg(socket, obj);
});

onBarCodeReader((event, barCodeReaderObj) => {
  barCodeDataObj.barCode_data = barCodeReaderObj.barCode_data;
  const obj = { auth, content: barCodeReaderObj };
  sendEncryptMsg(socket, obj);
});

onChnageConnectionType((event, connectionType) => {
  // barCodeDataObj.isConnectWithBT = connectionType.isConnectWithBT;
  const obj = { auth, content: connectionType };
  sendEncryptMsg(socket, obj);
});

onZebraPrinterHandler((event, zebraPrinterObj) => {
  zebraPrinterDataObj.zebra_data = zebraPrinterObj.zebra_data;
  const obj = { auth, content: zebraPrinterObj };
  sendEncryptMsg(socket, obj);
});

onDisconnectDeviceFromServer((event, args) => {
  auth['deviceId'] = args.deviceId;
  disconnectDevice.disconnectDevice.deviceDisconnected = true;
  disconnectDevice.disconnectDevice.deviceType = args.deviceName;
  disconnectDevice.disconnectDevice.deviceName = args.deviceName;
  const obj = { auth, content: disconnectDevice };
  sendEncryptMsg(socket, obj);
});

// chart scanning
onChartPosition((event, args) => {
  const obj = { auth, content: args };
  sendEncryptMsg(socket, obj);
});

onGrabInitialPosition((event, args) => {
  const obj = { auth, content: args };
  sendEncryptMsg(socket, obj);
});

// alwan api
onAlwanAPIReq((event, args) => {
  const colorGateAPIRequest = {
    type: 'colorGateAPIRequest',
  };
  const obj = { auth, content: colorGateAPIRequest };
  sendEncryptMsg(socket, obj);
});

onAlwanAPIRes((event, args) => {
  const obj = { auth, content: args };
  console.log(' ==== sending to alwan Response to websocket ==== ');
  sendEncryptMsg(socket, obj);
});

onAlwanServerConnectionReq((event, args) => {
  if (args?.isConnected == !alwanSocketConnection) return;
  if (!args.alwanLicense) return;
  console.log('onAlwanServerConnectionReq === ');
  const obj = {
    auth: { ...auth, licence: args.alwanLicense },
    content: {
      type: 'alwanServerConnection',
      alwanServerConnection: {
        isConnected: args?.isConnected,
      },
    },
  };
  console.log('sending to websocket == ');
  console.log(obj);
  sendEncryptMsg(socket, obj);
});

onAlwanConnectionCheck((event, args) => {
  const obj = { auth, content: args };
  console.log(' ==== sending to Alwan Response to websocket ==== ');
  sendEncryptMsg(socket, obj);
});

onAlwanUpdateLicense((event, args) => {
  console.log('onAlwanUpdateLicense === ');
  const obj = {
    auth,
    content: {
      type: 'updateAlwanServerLicense',
      updateAlwanServerLicense: {
        licence: args.licence,
      },
    },
  };
  console.log('sending to websocket == ');
  console.log(obj);
  sendEncryptMsg(socket, obj);
});

const handleAlwanAPIRequest = (msg) => {
  console.log('==== Received Alwan API Request ====');
  ipcSendAlwanAPIReq(msg);
};

const handleAlwanServerConnectionResponse = (msg) => {
  if (msg?.alwanServerConnection?.isConnected) {
    alwanSocketConnection = true;
  } else {
    alwanSocketConnection = false;
  }
  ipcAlwanServerConnectionRes(msg);
};

//colorGate api
onColorGateAPIReq((event, args) => {
  const colorGateAPIRequest = {
    type: 'colorGateAPIRequest',
  };
  const obj = { auth, content: colorGateAPIRequest };
  sendEncryptMsg(socket, obj);
});

onColorGateAPIRes((event, args) => {
  const obj = { auth, content: args };
  console.log(' ==== sending to ColorGate Response to websocket ==== ');
  sendEncryptMsg(socket, obj);
});

onColorGateServerConnectionReq((event, args) => {
  if (args?.isConnected == !colorGateSocketConnection) return;
  if (!args.colorGateLicense) return;
  console.log('onColorGateServerConnectionReq === ');
  const obj = {
    auth: { ...auth, licence: args.colorGateLicense },
    content: {
      type: 'colorGateServerConnection',
      colorGateServerConnection: {
        isConnected: args?.isConnected,
      },
    },
  };
  console.log('sending to websocket == ');
  console.log(obj);
  sendEncryptMsg(socket, obj);
});

onColorGateConnectionCheck((event, args) => {
  const obj = { auth, content: args };
  console.log(' ==== sending to ColorGate Response to websocket ==== ');
  sendEncryptMsg(socket, obj);
});

onColorGateUpdateLicense((event, args) => {
  console.log('onColorGateUpdateLicense === ');
  const obj = {
    auth,
    content: {
      type: 'updateColorGateServerLicense',
      updateColorGateServerLicense: {
        licence: args.licence,
      },
    },
  };
  console.log('sending to websocket == ');
  console.log(obj);
  sendEncryptMsg(socket, obj);
});

const handleColorGateAPIRequest = (msg) => {
  console.log('==== Received ColorGate API Request ====');
  ipcSendColorGateAPIReq(msg);
};

const handleColorGateServerConnectionResponse = (msg) => {
  if (msg?.colorGateServerConnection?.isConnected) {
    colorGateSocketConnection = true;
  } else {
    colorGateSocketConnection = false;
  }
  ipcColorGateServerConnectionRes(msg);
};

const resetDevice = () => {
  device.deviceInUse = false;
  device.deviceType = null;
  device.deviceName = null;
};

const getErrorObj = (message, errorNo) => {
  return { message, errorNo };
};

const getEncErrorObj = (message, errorNo) => {
  return encJObj({ message, errorNo });
};

// sends client encrypted msg / error string
const sendEncryptMsg = (socket, content) => {
  const res = encJObj(content);
  if (res.success) {
    socket.send(Buffer.from(res.message));
  } else {
    ipcCurrentAction(res.message);
  }
  return res.success;
};

// sends back to client if failed
const decryptMsg = (socket, content) => {
  const res = decJObj(content);
  if (!res.success) {
    ipcCurrentAction(res.message);
  }
  return res;
};

const sendDummyColorGateReq = () => {
  console.log('sending colorgate req in 5 seconds');
  dummyInterval = setInterval(() => {
    const fileName = 'Colorportal_Epson_SP4900_A3_CMYK.pdf';
    const RESOURCES_PATH = path.join(process.resourcesPath, 'assets');
    const getAssetPath = (...paths) => {
      return path.join(RESOURCES_PATH, ...paths);
    };
    const obj = {
      auth: { ...auth, isElectron: false },
      type: 'colorGateAPI',
      colorGateAPI: {
        request: {
          url: `/v1/files?filename=${fileName}`,
          method: 'post',
          headers: {
            'Content-Type': 'application/octet-stream',
          },
          data: fs.readFileSync(path.join(__dirname, '..', fileName), {
            encoding: 'base64',
          }),
        },
        type: 'file',
      },
    };
    const obj2 = {
      auth: { ...auth, isElectron: false },
      type: 'colorGateAPI',
      colorGateAPI: {
        request: {
          url: '/v1/jobs',
          method: 'post',
          headers: {
            'Content-Type': 'application/json',
          },
          data: fs.readFileSync(`./${fileName}`, {
            encoding: 'base64',
          }),
        },
        type: 'file',
        body: {
          queueName: 'Roland VS-300i',
          hotfolder: 'Roland VS-300i',
          fileID: '',
        },
      },
    };
    console.log('sending to websocket == ');
    sendEncryptMsg(socket, obj);
  }, 5000);
};

const sendDummyReq = () => {
  dummyInterval = setTimeout(() => {
    console.log('sending dummy req');
    const obj = {
      type: 'colorGateAPI',
      colorGateAPI: {
        request: {
          baseURL: 'https://google.com',
          url: '/users',
        },
      },
    };
    const obj2 = {
      type: 'colorGateAPI',
      colorGateAPI: {
        request: {
          baseURL: 'https://google.com',
          url: '/google',
        },
      },
    };
    const obj3 = {
      type: 'colorGateAPI',
      colorGateAPI: {
        request: {
          baseURL: 'https://jsonplaceholder.typicode.com',
          url: '/comments',
        },
      },
    };
    ipcSendColorGateAPIReq(obj);
    setTimeout(() => {
      ipcSendColorGateAPIReq(obj2);
    }, 2000);
    //ipcSendColorGateAPIReq(obj3);
  }, 5000);
};
