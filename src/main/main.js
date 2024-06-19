/* eslint-disable promise/always-return */
/* eslint-disable global-require */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  globalShortcut,
  Menu,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import axios from 'axios';
import { resolveHtmlPath } from './util';
import {
  CONNECTION_STATUS,
  CURRENT_ACTION,
  SETTINGS,
  CALIBRATION,
  MEASUREMENT,
  CONNECT_SOCKET,
  DISCONNECT_SOCKET,
  DEVICE_CONNECTION,
  VERIFY_DEVICE_CONNECTION,
  SHOW_DIALOG,
  DISCONNECT_DEVICE,
  CHECK_DEVICE_CONNECTION,
  SOCKET_CONNECTION,
  NETWORK_CONNECTION,
  SOCKET_DISCONNECT_CLEANLY,
  UPDATE_DEVICE_RECONNECTION,
  CLIENT_SOCKET_ALREADY_EXIST,
  DEVICE_RECONNECT_API_CALL,
  DEVICE_STATUS_UPDATE_CALL,
  DEVICE_DISCONNECT_API_CALL,
  CLOSE_DEVICE,
  GET_SAMPLES_DATA,
  CLEAR_SAMPLES,
  DEVICE_DISCONNECT_TIMEOUT,
  GET_DEVICE_AND_LICENSES,
  GET_TOKEN,
  ACQUIRE_LICENSE,
  RELEASE_LICENSE,
  GET_DEVICE_INSTANCE_URL,
  LOGIN,
  DEVICE_DISCONNECTION,
  MEASURE_IN_PROGRESS,
  DISCONNECT_DEVICE_FROM_SERVER,
  REFRESH_DEVICES_AND_LICENSES,
  CHECK_FOR_UPDATE,
  DOWNLOAD_UPDATE,
  QUIT_AND_INSTALL,
  UPDATE_ERROR,
  DOWNLOAD_PROGRESS,
  COLOR_GATE_API_REQ,
  COLOR_GATE_API_RES,
  CHECK_THIRD_PARTY_API_CONNECTION,
  COLOR_GATE_API_LOG,
  GET_IP,
  CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
  COLOR_GATE_SERVER_CONNECTION_REQ,
  COLOR_GATE_SERVER_CONNECTION_RES,
  COLOR_GATE_CONNECTION_CHECK,
  COLOR_GATE_CONNECTION_CHECK_REQ,
  COLOR_GATE_CONNECTION_CHECK_RES,
  CHECK_COLOR_GATE_API_CONNECTION,
  COLOR_GATE_UPDATE_LICENSE,
  GET_APP_VERSION,
  ALWAN_API_REQ,
  ALWAN_API_RES,
  CHECK_ALWAN_API_CONNECTION,
  ALWAN_API_LOG,
  TEST_ALWAN_API_CONNECTION,
  ALWAN_SERVER_CONNECTION_REQ,
  ALWAN_SERVER_CONNECTION_RES,
  CMA_API_FOR_ALWAN_STATUS_UPDATE,
  ALWAN_CONNECTION_CHECK,
  ALWAN_CONNECTION_CHECK_REQ,
  ALWAN_CONNECTION_CHECK_RES,
  ALWAN_UPDATE_LICENSE,
  SCAN_MEASUREMENT_RES,
  EXPORT_LAST_SCAN_DATA,
  CHART_POSITION,
  GRAB_INITIAL_POSITION,
  APP_CLOSE_CONFIRMED,
  APP_REQUEST_CLOSE,
  CLOSE_PB_DEVICE,
  WEIGHT_MEASUREMENT,
  MAKE_RESET_DEVICE,
  GET_TARE_VALUE,
  SET_TARE_VALUE,
  CHECK_PB_DEVICE_CONNECTION,
  VERIFY_PB_DEVICE_CONNECTION,
  ZEBRA_PRINTER_HANDLER,
  BAR_CODE_READER_HANDLER,
  SEND_OPEN_URL_TO_INPUT,
  URL_OPENED_BROWSER,
  CURRENT_TAB_UPDATE,
  BLUETOOTH_SCAN_DEVICE,
  SWITCH_TO_YS3060_CONNECTION_MODE,
  GET_MAC_ADDRESS,
  CHECK_ROP_DEVICE_CONNECTION,
  CHECK_BARCODE_DEVICE_CONNECTION,
  CHECK_ZEBRA_DEVICE_CONNECTION,
} from '../utility/constants';
import config from './config.json';
import { decJObj } from './crypto';
import {
  connectExact2Device,
  waitForExact2MeasurementComplete,
  loadExact2LibraryFunctions,
  getExact2SerialNumber,
  getBasicExact2DeviceInfo,
  setExact2DeviceConfiguration,
  disconnectExact2Device,
  checkExact2Calibration,
  updateExact2StartMeasure,
  getExact2MeasureStatus,
  getExact2AvgMeasurementData,
  setExact2DeviceConfigurationStripMode,
  getExact2AvgMeasurementDataStripMode,
} from './devices/exact2/exact2';

import {
  loadCi62LibraryFunctions,
  connectCi62Device,
  waitForCi62MeasurementComplete,
  getCi62MeasurementData,
  setCi62DeviceConfiguration,
  getCi62SerialNumber,
  getBasicCi62DeviceInfo,
  checkCi62Calibration,
  updateCI62StartMeasure,
  disconnectCi62Device,
  getCi62AllSamples,
  clearAllCi62Samples,
  getCI62MeasureStatus,
} from './devices/ci62/ci62';
import {
  connectCi64Device,
  setCi64DeviceConfiguration,
  waitForCi64MeasurementComplete,
  getCi64MeasurementData,
  loadCi64LibraryFunctions,
  getCi64SerialNumber,
  getBasicCi64DeviceInfo,
  disconnectCi64Device,
  checkCi64Calibration,
  updateCI64StartMeasure,
  getCi64AllSamples,
  clearAllCi64Samples,
  getCI64MeasureStatus,
} from './devices/ci64/ci64';
import {
  connectCi64UVDevice,
  setCi64UVDeviceConfiguration,
  waitForCi64UVMeasurementComplete,
  getCi64UVMeasurementData,
  loadCi64UVLibraryFunctions,
  getCi64UVSerialNumber,
  getBasicCi64UVDeviceInfo,
  disconnectCi64UVDevice,
  checkCi64UVCalibration,
  updateCI64UVStartMeasure,
  getCi64UVAllSamples,
  clearAllCi64UVSamples,
  getCI64UVMeasureStatus,
} from './devices/ci64UV/ci64UV';
import {
  connectExactDevice,
  waitForExactMeasurementComplete,
  loadExactLibraryFunctions,
  getExactSerialNumber,
  getBasicExactDeviceInfo,
  setExactDeviceConfiguration,
  disconnectExactDevice,
  checkExactCalibration,
  updateExactStartMeasure,
  getExactMeasureStatus,
  getExactAvgMeasurementData,
} from './devices/exact/exact';
import {
  setI1IOOptions,
  getI1IOBasicDeviceInfo,
  getI1IOSerialNumber,
  calibrateI1IODevice,
  grabInitialPositionI1IO,
  getTopLeftChartPositionI1IO,
  getBottomLeftChartPositionI1IO,
  getBottomRightChartPositionI1IO,
  waitForButtonPressedI1IO,
  scanChartAutomaticI1IO,
  getOutputFileDataI1IO,
  getMeasDataFromOutputFilesI1IO,
  resetMeasStringI1IO,
  openI1IODevice,
  closeI1IODevice,
  loadI1IOLibraryFunctions,
} from './devices/i1iO/i1iO';
import {
  openI1iO3Device,
  loadI1io3LibraryFunctions,
  getI1IO3BasicDeviceInfo,
  getI1IO3SerialNumber,
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
  getI1IO3StartMeasure,
  updateI1IO3StartMeasure,
  closeI1IO3Device,
} from './devices/i1iO3/i1iO3';
import {
  checkLabelPrinterConnection,
  handlePrintingProcess,
  loadPrinterFunctions,
} from './devices/zebra_printer/printZebraLabel';
import {
  openDevice,
  exposeLibraryFunctions,
  setDeviceOptions,
  calibrateDevice,
  calibrateDeviceStripMode,
  printErrorInfo,
  getI1Pro3SerialNumber,
  getI1Pro3BasicDeviceInfo,
  triggerAvgMeasurement,
  triggerAvgMeasurementStripMode,
  updateI1PRO3StartMeasure,
  getI1PRO3MeasureStatus,
  setDeviceOptionsStripMode,
} from './devices/i1Pro3/i1Pro3';
import {
  openI1ProDevice,
  setI1ProDeviceOptions,
  calibrateI1ProDevice,
  loadI1ProLibraryFunctions,
  getI1ProBasicDeviceInfo,
  triggerI1ProAvgMeasurement,
  getI1ProSerialNumber,
  updateI1PROStartMeasure,
  getI1PROMeasureStatus,
} from './devices/i1Pro/i1Pro';
import { checkBarcodeScannerConnection } from './devices/barcode_reader/barcodeReader';
import {
  checkBluetoothConnection,
  getInformationDeviceWithBT,
  getScannedDeviceList,
  measureDeviceAutomaticWithBT,
  measureDeviceManuallyWithBT,
  setSpectrometerOptions,
} from './devices/CMA-ROP64E-UV/CMA-ROP64E-UV-BT';
import {
  loadSpectrometerLibraryFunctions,
  closeSpectrometerDevice,
  calibrateSpectrometerDevice,
  measureDeviceManually,
  getInformationDevice,
  settingSpectrometerOptions,
  measureDeviceAutomatic,
  checkCMAROP64EConnection,
  calculateAverages,
} from './devices/CMA-ROP64E-UV/CMA-ROP64E-UV-USB';
import {
  checkPrecisionConnection,
  connectPrecisionBalance,
  extractFirstNumberFromArray,
  findCurrentWorkingMode,
  getPBSerialNumber,
  getStableResultCurrentUnit,
  setLowerThreshold,
  setTareValue,
  setUpperThreshold,
  setWorkingMode,
  setZero,
} from './devices/precisionBalance/precisionBalance';
import {
  alwanAPI,
  clientDeviceDisconnectAPICall,
  clientDeviceReconnectAPICall,
  colorGateAPI,
  getDeviceInstanceLink,
  getDeviceListAPICall,
  getLicensesAPICall,
  getToken,
  login,
  switchConnetionModeAPICall,
  updateAlwanUserStatusAPICall,
  updateColorGateUserStatusAPICall,
  updateDeviceStatusAPICall,
} from './API';
import {
  connectColorScoutDevice,
  grabInitialPositionColorScout,
  getColorScoutMeasureStatus,
  updateColorScoutStartMeasure,
  waitForButtonPressedColorScout,
  scanChartAutomaticColorScout,
  getOutputFileDataColoScout,
  loadDataFromCSV,
} from './devices/colorscout/colorscout';
import { getLocalIp } from './utility';

// get encrypted github token and decrypt it for auto-update
const encryptToken = config['auto-update-token'];

const updateToken = decJObj(encryptToken).message;

// const octokit = new Octokit({ auth: updateToken });

export default class AppUpdater {
  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.setFeedURL({
      provider: config.provider,
      owner: config.owner,
      repo: config.repo,
      token: updateToken,
    });
  }
}

let currectOpenTab;
let mainWindow = null;
let webSocketWorkerWindow = null;
let deviceSerialNumber = null;
let hasDeviceDisconnectTimeout = false;
let deviceDisconnectionTimeout = null;
const deviceMeasurementTimeout = null;

// singleInstanceLock to avoid cloning new window
const singleInstanceLock = app.requestSingleInstanceLock();

// color gate api config
const colorGateBaseURL = null;
const colorGateAuth = null;
const colorGateFilePath = null;

// alwan gate api config
const alwanBaseURL = null;
const alwanAuth = null;

const connectionTypeROP = null;
const switchConnetionModeInstanceURL = null;

const macAddress = null;

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

// create hidden worker window
const createWebSocketWorkerWindow = () => {
  webSocketWorkerWindow = new BrowserWindow({
    show: false,
    width: 200,
    height: 200,
    autoHideMenuBar: true,
    parent: mainWindow,
    webPreferences: {
      devTools: isDebug,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  let websocketPath = null;
  if (isDebug) {
    websocketPath = path.resolve(
      __dirname,
      '..',
      'webSocketWorker',
      'index.html',
    );
    webSocketWorkerWindow.loadFile(websocketPath);
  } else {
    websocketPath = `file://${path.resolve(
      __dirname,
      '../webSocketWorker/',
      'index.html',
    )}`;
    webSocketWorkerWindow.loadURL(websocketPath);
  }
};

// loadLibraries after main window load
const loadInitialLibraries = () => {
  try {
    // exposing/load i1Pro3 library function
    exposeLibraryFunctions();

    // exposing/load exact library function
    loadExactLibraryFunctions();

    // exposing/load exact2 library function
    loadExact2LibraryFunctions();

    // // exposing/load i1Pro library function
    loadI1ProLibraryFunctions();

    // TODO: exposing/load i1io3 library function
    loadI1io3LibraryFunctions();

    // TODO:exposing/load i1io library function
    loadI1IOLibraryFunctions();

    if (process.platform === 'win32') {
      // exposing/load Ci62 library function
      loadCi62LibraryFunctions();
      // exposing/load Spectrometer library function
      // loadSpectrometerLibraryFunctions();
      // exposing/load Ci64 library function
      loadCi64LibraryFunctions();
      // exposing/load Ci64UV library function
      loadCi64UVLibraryFunctions();
      // exposing/load Label printer library function
      loadPrinterFunctions();
    }
  } catch (error) {}
};
const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths) => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1440,
    height: 768,
    minWidth: 1024,
    minHeight: 662,
    maxWidth: 2560,
    maxHeight: 1460,
    autoHideMenuBar: true,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      devTools: isDebug,
      nodeIntegration: true,
      // contextIsolation: false,
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });
  // create socket worker window
  createWebSocketWorkerWindow();

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }

    // load initial libraries
    loadInitialLibraries();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', (event) => {
    console.log('evdsgfrent', event)
    if (!app.isQuitting) {
      event.preventDefault();
      event.reply(APP_REQUEST_CLOSE);
    }
  });

  // Open urls in the user's browser
  mainWindow.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

// check if single instance lock is acquired, if not quit or load the main window
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Create myWindow, load the rest of the app, etc...
  app.on('window-all-closed', () => {
    // Respect the OSX convention of having the application in memory even
    // after all windows have been closed
    if (process.platform !== 'darwin') {
      // app.quit(); // not closing in case of i1io3
      process.kill(process.pid);
    }
  });

  app
    .whenReady()
    .then(() => {
      createWindow();
      app.on('activate', () => {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (mainWindow === null) createWindow();
      });
      globalShortcut.register('CommandOrControl+R', () => false);
      globalShortcut.register('F5', () => false);

      // Check if we are on a MAC
      if (process.platform === 'darwin') {
        // Create our menu entries so that we can use MAC shortcuts
        Menu.setApplicationMenu(
          Menu.buildFromTemplate([
            {
              label: app.name,
              submenu: [{ role: 'quit' }],
            },
            {
              label: 'Edit',
              submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'pasteandmatchstyle' },
                { role: 'delete' },
                { role: 'selectall' },
              ],
            },
          ]),
        );
      }
      return true;
    })
    .catch(console.log);
}

// Listen for the 'app-close-confirmed' event from the renderer process
ipcMain.on(APP_CLOSE_CONFIRMED, () => {
  app.isQuitting = true; // Mark that the app is quitting
  app.quit();
});

// ipc calls exchange between main process and main window renderer and websocket window renderer
// pass connect socket call from main renderer to websocket renderer
ipcMain.on(CONNECT_SOCKET, (event, args) => {
  try {
    webSocketWorkerWindow.webContents.send(CONNECT_SOCKET, args);
  } catch (error) {
    console.log('error', error);
  }
});

// pass disconnect socket call from main renderer to websocket renderer
ipcMain.on(DISCONNECT_SOCKET, () => {
  webSocketWorkerWindow.webContents.send(DISCONNECT_SOCKET);
});

// on verify device connection call for updating device array on websocket server
ipcMain.on(VERIFY_DEVICE_CONNECTION, async (event, args) => {
  console.log('args', args)
  // verify deviceConnection
  const { res, serialNumber } = await verifyDeviceConnection(args.deviceType);
  deviceSerialNumber = serialNumber;
  // send main window for device verification response
  mainWindow.webContents.send(VERIFY_DEVICE_CONNECTION, res);
  if (res) {
    const isROP64EUVDevice =
      args.deviceType === 'CMA-ROP64E-UV-BT' ||
      args.deviceType === 'CMA-ROP64E-UV';

    if (isROP64EUVDevice) {
      const object = {
        instanceURL: switchConnetionModeInstanceURL,
        deviceId: args?.deviceId,
        isConnectWithBT: connectionTypeROP,
      };
      switchConnetionModeAPICall(
        object.instanceURL,
        object.deviceId,
        object.isConnectWithBT,
      );
    }
    // send socket window to update available Device list
    webSocketWorkerWindow.webContents.send(VERIFY_DEVICE_CONNECTION, {
      device: args,
      serialNumber,
    });
  }
});

// on verify device connection call for updating device array on websocket server
ipcMain.on(VERIFY_PB_DEVICE_CONNECTION, async (event, args) => {
  // verify deviceConnection
  const { res, serialNumber } = await verifyDeviceConnection(args.deviceType);
  deviceSerialNumber = serialNumber;
  // send main window for device verification response
  mainWindow.webContents.send(VERIFY_PB_DEVICE_CONNECTION, res);
  if (res) {
    // send socket window to update available Device list
    webSocketWorkerWindow.webContents.send(VERIFY_DEVICE_CONNECTION, {
      device: args,
      serialNumber,
    });
  }
});

// on device reconnection after getting disconnected
ipcMain.on(UPDATE_DEVICE_RECONNECTION, async (event, args) => {
  const { res, serialNumber } = await verifyDeviceConnection(args.deviceType);
  // send main window for device verification response
  if (res) {
    // send socket window to update available Device list
    webSocketWorkerWindow.webContents.send(UPDATE_DEVICE_RECONNECTION, {
      device: args,
      serialNumber,
    });
  }
});

// device reconnect api call to update status on CMA site
ipcMain.on(DEVICE_RECONNECT_API_CALL, (event, args) => {
  const { instanceURL, deviceName, deviceId } = args;
  clientDeviceReconnectAPICall(
    instanceURL,
    deviceId,
    deviceName,
    deviceSerialNumber,
  );
});

// device disconnect api call to update status on cma site
ipcMain.on(DEVICE_DISCONNECT_API_CALL, async (event, args) => {
  const { instanceURL, deviceName, deviceId } = args;
  const res = await clientDeviceDisconnectAPICall(
    instanceURL,
    deviceId,
    deviceName,
    deviceSerialNumber,
  );
  mainWindow.webContents.send(DEVICE_DISCONNECT_API_CALL, res);
});

// remove device from websocket device list
ipcMain.on(DISCONNECT_DEVICE_FROM_SERVER, (event, args) => {
  // send device disconnection detail to socket for removing device in server list
  webSocketWorkerWindow.webContents.send(DISCONNECT_DEVICE_FROM_SERVER, args);
});

// to update device status on cma site
ipcMain.on(DEVICE_STATUS_UPDATE_CALL, (event, args) => {
  const { instanceURL, device, status } = args;
  updateDeviceStatusAPICall(
    instanceURL,
    device?.deviceId,
    device?.deviceType,
    deviceSerialNumber,
    status,
  );
});

// event from websocket renderer on socket disconnect cleanly
ipcMain.on(SOCKET_DISCONNECT_CLEANLY, (event, args) => {
  mainWindow.webContents.send(SOCKET_DISCONNECT_CLEANLY, args);
});

// event from websocket renderer on socket already exist error
ipcMain.on(CLIENT_SOCKET_ALREADY_EXIST, (event, args) => {
  mainWindow.webContents.send(CLIENT_SOCKET_ALREADY_EXIST, args);
});

// event on socket connection response from websocket renderer
ipcMain.on(SOCKET_CONNECTION, (event, args) => {
  console.log('SOCKET_CONNECTION args', args)
  event.reply(SOCKET_CONNECTION, args);
});

// In this event check if there is internet or not
ipcMain.on(NETWORK_CONNECTION, async (event, args) => {
  let status = false;

  // Increase the timeout to 10 seconds to handle slower networks
  const timeout = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timed out'));
    }, 7000);
  });

  // Use multiple URLs for redundancy
  const urls = [
    'http://www.google.com',
    'https://en.wikipedia.org',
    'https://api.github.com',
    'https://www.youtube.com',
    'https://www.reddit.com',
  ];

  // Implement retry logic with three attempts
  for (const url of urls) {
    const onlinePromise = checkStatus(url);

    try {
      const onlineResponse = await Promise.race([timeout, onlinePromise]);

      if (onlineResponse) {
        status = true;
        break; // Connection successful, no need to check other URLs
      }
    } catch (err) {
      // Ignore timeout errors, move on to the next URL
      continue;
    }
  }
  args.status = status;
  mainWindow.webContents.send(NETWORK_CONNECTION, args);
});

// event on device disconnect from main renderer
ipcMain.on(DISCONNECT_DEVICE, (event, args) => {
  // reset startMeasure of any ingoing measurement
  updateDeviceMeasureFlag(args.deviceType, false);
  // send socket window to remove device from available Device list
  webSocketWorkerWindow.webContents.send(DISCONNECT_DEVICE, args);
});

ipcMain.on(CLOSE_DEVICE, async (event, args) => {
  if (args.forceClose) {
    // stop current measurement forcefully
    updateDeviceMeasureFlag(args.deviceType, false);
  } else {
    const measureInProgress = getDeviceMeasureStatus(args.deviceType);
    // if any measurement in progress then send warning back
    if (measureInProgress) {
      mainWindow.webContents.send(MEASURE_IN_PROGRESS, args.deviceType);
      return;
    }
  }
  const disconnectResult = await disconnectDevice(args.deviceType);
  disconnectResult.deviceType = args.deviceType;

  const response = await clientDeviceDisconnectAPICall(
    args.instanceURL,
    args.deviceId,
    args.deviceType,
    deviceSerialNumber,
  );
  if (response.res) {
    mainWindow.webContents.send(CLOSE_DEVICE, disconnectResult);
  } else {
    mainWindow.webContents.send(CLOSE_DEVICE, {});
  }
  if (disconnectResult.res) {
    // clear device disconnect timeout
    clearDeviceDisconnectTimeout();
  }
});

ipcMain.on(CLOSE_PB_DEVICE, (event, args) => {
  if (args.forceClose) {
    // stop current measurement forcefully
    updateDeviceMeasureFlag(args.deviceType, false);
  } else {
    const measureInProgress = getDeviceMeasureStatus(args.deviceType);
    if (measureInProgress) {
      mainWindow.webContents.send(MEASURE_IN_PROGRESS, args.deviceType);
      return;
    }
  }
  const res = disconnectDevice(args.deviceType);
  res.deviceType = args.deviceType;
  res.deviceId = args?.deviceId;
  mainWindow.webContents.send(CLOSE_PB_DEVICE, res);
  if (res.res) {
    clearDeviceDisconnectTimeout();
  }
});

// to be send to main windows to update device connection status
ipcMain.on(CHECK_DEVICE_CONNECTION, async (event, args) => {
  const res = await checkDeviceConnection(args);
  mainWindow.webContents.send(CHECK_DEVICE_CONNECTION, res);
});

ipcMain.on(CHECK_ROP_DEVICE_CONNECTION, async (event, args) => {
  const res = await checkDeviceConnection(args);
  mainWindow.webContents.send(CHECK_ROP_DEVICE_CONNECTION, res);
});

ipcMain.on(CHECK_PB_DEVICE_CONNECTION, async (event, args) => {
  const status = await checkDeviceConnection(args.deviceType);
  args.status = status;
  mainWindow.webContents.send(CHECK_PB_DEVICE_CONNECTION, args);
});

ipcMain.on(CHECK_ZEBRA_DEVICE_CONNECTION, async (event, args) => {
  const status = await checkDeviceConnection(args.deviceType);
  args.status = status;
  mainWindow.webContents.send(CHECK_ZEBRA_DEVICE_CONNECTION, args);
});

ipcMain.on(CHECK_BARCODE_DEVICE_CONNECTION, async (event, args) => {
  const status = await checkDeviceConnection(args.deviceType);
  args.status = status;
  mainWindow.webContents.send(CHECK_BARCODE_DEVICE_CONNECTION, args);
});

// to be send to main windows to update status
ipcMain.on(CONNECTION_STATUS, (event, args) => {
  console.log('args CONNECTION_STATUS', args)
  event.reply(CONNECTION_STATUS, args);
});

// to be send to main windows to update status
ipcMain.on(CURRENT_ACTION, (event, args) => {
  console.log('args', args)
  event.reply(CURRENT_ACTION, args);
});

// to show dialog box message
ipcMain.on(SHOW_DIALOG, (event, args) => {
  mainWindow.webContents.send(SHOW_DIALOG, args);
});

// on get samples event for ci6x devices
ipcMain.on(GET_SAMPLES_DATA, async (_, args) => {
  if (args == 'CI62') {
    const sampleRes = await getCi62AllSamples();
    mainWindow.webContents.send(GET_SAMPLES_DATA, sampleRes);
  }
  if (args == 'CI64') {
    const sampleRes = await getCi64AllSamples();
    mainWindow.webContents.send(GET_SAMPLES_DATA, sampleRes);
  }
  if (args == 'CI64UV') {
    const sampleRes = await getCi64UVAllSamples();
    mainWindow.webContents.send(GET_SAMPLES_DATA, sampleRes);
  }
});

// on clear samples event for ci6x devices
ipcMain.on(CLEAR_SAMPLES, async (_, args) => {
  if (args == 'CI62') {
    const res = await clearAllCi62Samples();
    mainWindow.webContents.send(CLEAR_SAMPLES, { ...res, deviceType: args });
  }
  if (args == 'CI64') {
    const res = await clearAllCi64Samples();
    mainWindow.webContents.send(CLEAR_SAMPLES, { ...res, deviceType: args });
  }
  if (args == 'CI64UV') {
    const res = await clearAllCi64UVSamples();
    mainWindow.webContents.send(CLEAR_SAMPLES, { ...res, deviceType: args });
  }
});

// on device disconnect timeout
ipcMain.on(DEVICE_DISCONNECT_TIMEOUT, (_, args) => {
  if (args.hasTimeout) {
    // start device disconnection timeout
    hasDeviceDisconnectTimeout = true;
    setDeviceDisconnectTimeout(args.deviceType);
  } else {
    // clear device disconnection timeout if any
    hasDeviceDisconnectTimeout = false;
    clearDeviceDisconnectTimeout();
  }
});

// on device connection call from websocket
ipcMain.on(DEVICE_CONNECTION, async (event, args) => {
  // calling openDevice function
  const openRes = await openDeviceAndGetInfo(
    args.deviceConnection.deviceType,
    args,
  );

  if (args.deviceConnection.deviceType.split('_')[1] == 'COLORSCOUT') {
    args.deviceConnection.deviceInfo = openRes.deviceInfo;
    args.deviceConnection.isConnected = openRes.res;
    updateCurrentAction(
      `device set ${args.deviceConnection.deviceName} : ${args.deviceConnection.isConnected}`,
    );
    webSocketWorkerWindow.webContents.send(DEVICE_CONNECTION, args);
    mainWindow.webContents.send(DEVICE_CONNECTION, openRes.res);
    return;
  }
  if (!openRes.res) return;

  args.deviceConnection.deviceInfo = openRes.deviceInfo;
  args.deviceConnection.isConnected = true;
  updateCurrentAction(`device set ${args.deviceConnection.deviceName}`);
  webSocketWorkerWindow.webContents.send(DEVICE_CONNECTION, args);
  mainWindow.webContents.send(DEVICE_CONNECTION, true);
});

// on device disconnection call from websocket
ipcMain.on(DEVICE_DISCONNECTION, (event, args) => {
  mainWindow.webContents.send(DEVICE_DISCONNECTION, args);
});

// on settings call from websocket
ipcMain.on(SETTINGS, (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(SETTINGS, args)) return;
  handleSettingsRequest(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

// on calibration call from websocket
ipcMain.on(CALIBRATION, (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(CALIBRATION, args)) return;
  handleCalibrationRequest(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

// on measurement calls from websocket
ipcMain.on(MEASUREMENT, async (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(MEASUREMENT, args)) return;
  await handleMeasurementRequest(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(WEIGHT_MEASUREMENT, async (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(WEIGHT_MEASUREMENT, args)) return;
  await handleWeightRequest(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(MAKE_RESET_DEVICE, async (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(MAKE_RESET_DEVICE, args)) return;
  await handleResetDataForPB(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(GET_TARE_VALUE, async (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(GET_TARE_VALUE, args)) return;
  await handleGetTareValue(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(SET_TARE_VALUE, async (event, args) => {
  if (!checkDeviceOpen(SET_TARE_VALUE, args)) return;
  await handleSetTareValue(args);
  if (hasDeviceDisconnectTimeout) {
    clearDeviceDisconnectTimeout();
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(ZEBRA_PRINTER_HANDLER, async (event, args) => {
  if (!checkDeviceOpen(ZEBRA_PRINTER_HANDLER, args)) return;
  await handleZebraPrinter(args);
  if (hasDeviceDisconnectTimeout) {
    clearDeviceDisconnectTimeout();
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(BAR_CODE_READER_HANDLER, async (event, args) => {
  if (!checkDeviceOpen(BAR_CODE_READER_HANDLER, args)) return;
  await handleBarcodeReader(args);
  if (hasDeviceDisconnectTimeout) {
    clearDeviceDisconnectTimeout();
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(SEND_OPEN_URL_TO_INPUT, async (event, args) => {
  const data = {
    deviceConnection: {
      deviceType: 'barcode_reader',
      deviceName: 'barcode_reader',
      isConnected: false,
    },
    barCode_data: {
      isReaded: true,
      device_data: args,
      open_Url: '',
      deviceName: false,
      is_responed: false,
    },
  };

  webSocketWorkerWindow.webContents.send(BAR_CODE_READER_HANDLER, data);
});

// on chartPosition calls from websocket
ipcMain.on(CHART_POSITION, async (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(CHART_POSITION, args)) return;
  await handleChartPositionRequest(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

// on chartPosition calls from websocket
ipcMain.on(GRAB_INITIAL_POSITION, async (event, args) => {
  // check if device is connected or not
  if (!checkDeviceOpen(GRAB_INITIAL_POSITION, args)) return;
  await handleGrabInitialPositionRequest(args);
  if (hasDeviceDisconnectTimeout) {
    // clear device disconnection timeout
    clearDeviceDisconnectTimeout();
    // start new device disconnection timeout
    setDeviceDisconnectTimeout(args.deviceConnection.deviceType);
  }
});

ipcMain.on(URL_OPENED_BROWSER, async (event, args) => {
  try {
    const data = {
      deviceConnection: {
        deviceType: 'barcode_reader',
        deviceName: 'barcode_reader',
        isConnected: false,
      },
      barCode_data: {
        isReaded: true,
        open_Url: '',
        deviceName: false,
        is_responed: false,
      },
    };

    webSocketWorkerWindow.webContents.send(BAR_CODE_READER_HANDLER, args);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
});

ipcMain.on(CURRENT_TAB_UPDATE, async (event, args) => {
  console.log('🚀 ~ ipcMain.on ~ args:', args);
  try {
    if (args) {
      currectOpenTab = args;
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
    currectOpenTab = '';
  }
});

ipcMain.on(BLUETOOTH_SCAN_DEVICE, async (event, args) => {
  try {
    await getInformationDeviceWithBT();
    const deviceListReceived = await getScannedDeviceList();
    mainWindow.webContents.send(BLUETOOTH_SCAN_DEVICE, deviceListReceived);
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
});

ipcMain.on(SWITCH_TO_YS3060_CONNECTION_MODE, async (event, args) => {
  console.log(
    '🚀 ~ file: main.js:1136 ~ ipcMain.on ~ SWITCH_TO_YS3060_CONNECTION_MODE:',
    args,
  );
  connectionTypeROP = args.args;
  switchConnetionModeInstanceURL = args.instanceURL;
});

ipcMain.on(GET_MAC_ADDRESS, async (event, args) => {
  macAddress = args;
});

// to update current websocket calls actions
const updateCurrentAction = (msg) => {
  mainWindow.webContents.send(CURRENT_ACTION, msg);
};

// Check if there is internet or not
const checkStatus = async (url) => {
  try {
    const response = await axios.get(url);
    return response.status >= 200 && response.status < 300;
  } catch (err) {
    return false; // Definitely offline
  }
};

// common function to get device info
const openDeviceAndGetInfo = async (msgType, content) => {
  let newErrorMessage = '';
  try {
    switch (content.deviceConnection.deviceType) {
      case 'I1PRO3':
      case 'I1PRO3_STRIPMODE': {
        const isOpen = openDevice();
        if (isOpen) {
          const deviceInfo = getI1Pro3BasicDeviceInfo();
          return { res: true, deviceInfo };
        }
        break;
      }

      case 'I1PRO2': {
        const openRes = openI1ProDevice();
        if (openRes.res) {
          const i1Pro2DeviceInfo = getI1ProBasicDeviceInfo();
          return { res: true, deviceInfo: i1Pro2DeviceInfo };
        }
        break;
      }

      case 'CI62': {
        const result = connectCi62Device();
        if (result.res) {
          const ci62DeviceInfo = getBasicCi62DeviceInfo();
          return { res: true, deviceInfo: ci62DeviceInfo };
        }
        break;
      }

      case 'CI62_COLORSCOUT': {
        const result = await connectColorScoutDevice(
          content.deviceConnection.deviceType,
        );
        if (result.res) {
          const ci62DeviceInfo = getBasicCi62DeviceInfo();
          return { res: true, deviceInfo: ci62DeviceInfo };
        }
        if (!result.res) {
          newErrorMessage = result.error;
        }
        break;
      }

      case 'CI64': {
        const ci64Result = connectCi64Device();
        if (ci64Result.res) {
          const ci64DeviceInfo = getBasicCi64DeviceInfo();
          return { res: true, deviceInfo: ci64DeviceInfo };
        }
        break;
      }

      case 'CI64UV': {
        const ci64UVResult = connectCi64UVDevice();
        if (ci64UVResult.res) {
          const ci64UVDeviceInfo = getBasicCi64UVDeviceInfo();
          return { res: true, deviceInfo: ci64UVDeviceInfo };
        }
        break;
      }

      case 'CI64_COLORSCOUT': {
        const result = await connectColorScoutDevice(
          content.deviceConnection.deviceType,
        );
        if (result.res) {
          const ci64DeviceInfo = getBasicCi64DeviceInfo();
          return { res: true, deviceInfo: ci64DeviceInfo };
        }
        if (!result.res) {
          newErrorMessage = result.error;
        }
        break;
      }

      case 'CI64UV_COLORSCOUT': {
        const result = await connectColorScoutDevice(
          content.deviceConnection.deviceType,
        );
        if (result.res) {
          const ci64UVDeviceInfo = getBasicCi64UVDeviceInfo();
          return { res: true, deviceInfo: ci64UVDeviceInfo };
        }
        if (!result.res) {
          newErrorMessage = result.error;
        }
        break;
      }

      case 'EXACT': {
        const exactResult = connectExactDevice();
        if (exactResult.res) {
          const exactDeviceInfo = getBasicExactDeviceInfo();
          return { res: true, deviceInfo: exactDeviceInfo };
        }
        break;
      }

      case 'EXACT2':
      case 'EXACT2_STRIPMODE': {
        const exact2Result = connectExact2Device();
        if (exact2Result.res) {
          const exact2DeviceInfo = getBasicExact2DeviceInfo();
          return { res: true, deviceInfo: exact2DeviceInfo };
        }
        break;
      }

      case 'I1IO3': {
        const i1io3Result = openI1iO3Device();
        if (i1io3Result.res) {
          const i1IO3DeviceInfo = getI1IO3BasicDeviceInfo();
          return { res: true, deviceInfo: i1IO3DeviceInfo };
        }
        break;
      }

      case 'I1IO2': {
        const i1ioResult = openI1IODevice();
        if (i1ioResult.res) {
          const i1IO2DeviceInfo = getI1IOBasicDeviceInfo();
          return { res: true, deviceInfo: i1IO2DeviceInfo };
        }
        break;
      }

      case 'PRECISION_BALANCE': {
        const result = await connectPrecisionBalance();
        if (result.res) {
          const serialNumber = await getPBSerialNumber();
          return {
            res: true,
            deviceInfo: { SerialNumber: serialNumber?.data },
          };
        }
        break;
      }

      case 'CMA-ROP64E-UV': {
        try {
          let result;

          if (connectionTypeROP) {
            result = await checkBluetoothConnection();
            if (result.res) {
              result = await getInformationDeviceWithBT();
            }
          } else {
            result = await checkCMAROP64EConnection();
            if (result.res) {
              result = await getInformationDevice();
            }
          }

          if (result.res) {
            return {
              res: true,
              deviceInfo: {
                SerialNumber: connectionTypeROP
                  ? result?.data?.serialNumber
                  : result?.data,
              },
            };
          }
        } catch (error) {
          console.error('Error:', error);
          return { res: false, error: error.message };
        }
        break;
      }

      case 'CMA-ROP64E-UV_COLORSCOUT': {
        const result = await connectColorScoutDevice(
          content.deviceConnection.deviceType,
        );
        if (result.res) {
          const deviceInfo = await getInformationDevice();
          if (deviceInfo.res) {
            return {
              res: true,
              deviceInfo: { SerialNumber: deviceInfo?.data },
            };
          }
        }
        break;
      }

      case 'CMA-ROP64E-UV-BT': {
        const result = await checkBluetoothConnection();
        if (result.res) {
          const deviceInfo = await getInformationDeviceWithBT();
          if (deviceInfo.res) {
            return {
              res: true,
              deviceInfo: { SerialNumber: deviceInfo?.data.serialNumber },
            };
          }
        }
        break;
      }

      // case 'CMA-ROP64E-UV-BT_COLORSCOUT': {
      //   const result = await connectColorScoutDevice(
      //     content.deviceConnection.deviceType
      //   );
      //   if (result.res) {
      //     const deviceInfo = await checkBluetoothConnection();
      //     if (deviceInfo.res) {
      //       return {
      //         res: true,
      //         deviceInfo: { SerialNumber: deviceInfo?.data?.serialNumber },
      //       };
      //     }
      //   }
      //   break;
      // }

      case 'label_printer': {
        const result = await checkLabelPrinterConnection();
        if (result.res) {
          return {
            res: true,
            deviceInfo: { SerialNumber: 'cma-label-printer-2024' },
          };
        }
        break;
      }

      case 'barcode_reader': {
        const result = await checkBarcodeScannerConnection();
        if (result.res) {
          return {
            res: true,
            deviceInfo: { SerialNumber: 'cma-barcode-reader-2024' },
          };
        }
        break;
      }

      default:
        break;
    }
    content.error = {
      message:
        newErrorMessage || 'Device is not connected properly or disconnected',
    };
  } catch (error) {
    content.error = { message: error.message };
  }

  updateCurrentAction(content.error.message);
  webSocketWorkerWindow.webContents.send(msgType, content);
  return { res: false, deviceInfo: null };
};

// common function to check device connection
const checkDeviceConnection = async (device) => {
  try {
    switch (device) {
      case 'I1PRO3':
      case 'I1PRO3_STRIPMODE': {
        const isOpen = openDevice();
        if (isOpen) return true;
        break;
      }

      case 'I1PRO2': {
        const openRes = openI1ProDevice();
        if (openRes.res) return true;
        break;
      }

      case 'CI62': {
        const result = connectCi62Device();
        if (result.res) return true;
        break;
      }

      case 'CI62_COLORSCOUT': {
        const result = connectCi62Device();
        if (result.res) return true;
        break;
      }

      case 'CI64': {
        const ci64Result = connectCi64Device();
        if (ci64Result.res) return true;
        break;
      }

      case 'CI64UV': {
        const ci64UVResult = connectCi64UVDevice();
        if (ci64UVResult.res) return true;
        break;
      }

      case 'CI64_COLORSCOUT': {
        const result = connectCi64Device();
        if (result.res) return true;
        break;
      }

      case 'CI64UV_COLORSCOUT': {
        const result = connectCi64UVDevice();
        if (result.res) return true;
        break;
      }

      case 'EXACT': {
        const exactResult = connectExactDevice();
        if (exactResult.res) return true;
        break;
      }

      case 'EXACT2':
      case 'EXACT2_STRIPMODE': {
        const exact2Result = connectExact2Device();
        if (exact2Result.res) return true;
        break;
      }

      case 'I1IO3': {
        const i1io3Result = openI1iO3Device();
        if (i1io3Result.res) return true;
        break;
      }

      case 'I1IO2': {
        const i1ioResult = openI1IODevice();
        if (i1ioResult.res) return true;
        break;
      }

      case 'PRECISION_BALANCE': {
        const result = await checkPrecisionConnection();
        if (result.res) return true;
        break;
      }

      case 'CMA-ROP64E-UV':
      case 'CMA-ROP64E-UV_COLORSCOUT': {
        let result;
        if (connectionTypeROP) {
          result = await checkBluetoothConnection();
        } else {
          result = await checkCMAROP64EConnection();
        }

        if (result.res) return true;
        break;
      }

      case 'CMA-ROP64E-UV-BT': {
        // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
        const result = await checkBluetoothConnection();
        if (result.res) return true;
        break;
      }

      case 'label_printer': {
        const result = await checkLabelPrinterConnection();
        if (result.res) return true;
        break;
      }

      case 'barcode_reader': {
        const result = await checkBarcodeScannerConnection();
        if (result.res) return true;
        break;
      }

      default:
        break;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// common function to disconnect device
const disconnectDevice = (device) => {
  try {
    switch (device) {
      case 'I1PRO3':
      case 'I1PRO3_STRIPMODE': {
        return { res: true, error: null };
        break;
      }

      case 'I1PRO2':
        return { res: true, error: null };

      case 'CI62':
        return disconnectCi62Device();

      case 'CI62_COLORSCOUT':
        return disconnectCi62Device();

      case 'CI64':
        return disconnectCi64Device();

      case 'CI64UV':
        return disconnectCi64UVDevice();

      case 'CI64_COLORSCOUT':
        return disconnectCi64Device();

      case 'CI64UV_COLORSCOUT':
        return disconnectCi64UVDevice();

      case 'EXACT':
        return disconnectExactDevice();

      case 'EXACT2':
      case 'EXACT2_STRIPMODE': {
        return disconnectExact2Device();
      }

      case 'I1IO3':
        return closeI1IO3Device();

      case 'I1IO2':
        return closeI1IODevice();

      case 'PRECISION_BALANCE': {
        return { res: true, error: null };
      }

      case 'CMA-ROP64E-UV':
      case 'CMA-ROP64E-UV_COLORSCOUT': {
        return closeSpectrometerDevice();
      }

      case 'CMA-ROP64E-UV-BT': {
        // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
        return closeSpectrometerDevice();
      }
      case 'label_printer': {
        return { res: true, error: null };
      }

      case 'barcode_reader': {
        return { res: true, error: null };
      }

      default:
        break;
    }
    return { res: false, error: null };
  } catch (error) {
    return { res: false, error: null };
  }
};

// common function to check weather device is still open and connected or not
const checkDeviceOpen = (msgType, content) => {
  const res = checkDeviceConnection(content.deviceConnection.deviceType);
  if (res) return true;
  content.error = {
    message: 'Device is not connected properly or disconnected ',
  };
  updateCurrentAction(content.error.message);
  webSocketWorkerWindow.webContents.send(msgType, content);
  return false;
};

// common function to verify device connection and get serial number if connection is true
const verifyDeviceConnection = async (deviceName) => {
  try {
    switch (deviceName) {
      case 'I1PRO3':
      case 'I1PRO3_STRIPMODE': {
        const isOpen = openDevice();
        if (isOpen) {
          const i1Pro3SerialNumber = getI1Pro3SerialNumber();
          return { res: true, serialNumber: i1Pro3SerialNumber };
        }
        break;
      }

      case 'I1PRO2': {
        const openRes = openI1ProDevice();
        if (openRes.res) {
          const i1Pro2SerialNumber = getI1ProSerialNumber();
          return { res: true, serialNumber: i1Pro2SerialNumber };
        }
        break;
      }

      case 'CI62': {
        const result = connectCi62Device();
        if (result.res) {
          const ci62SerialNumber = getCi62SerialNumber();
          return { res: true, serialNumber: ci62SerialNumber };
        }
        break;
      }

      case 'CI62_COLORSCOUT': {
        const result = connectCi62Device();
        if (result.res) {
          const ci62SerialNumber = getCi62SerialNumber();
          return { res: true, serialNumber: ci62SerialNumber };
        }
        break;
      }

      case 'CI64': {
        const ci64Result = connectCi64Device();
        if (ci64Result.res) {
          const ci64SerialNumber = getCi64SerialNumber();
          return { res: true, serialNumber: ci64SerialNumber };
        }
        break;
      }

      case 'CI64UV': {
        const ci64UVResult = connectCi64UVDevice();
        if (ci64UVResult.res) {
          const ci64UVSerialNumber = getCi64UVSerialNumber();
          return { res: true, serialNumber: ci64UVSerialNumber };
        }
        break;
      }

      case 'CI64_COLORSCOUT': {
        const result = connectCi64Device();
        if (result.res) {
          const ci62SerialNumber = getCi64SerialNumber();
          return { res: true, serialNumber: ci62SerialNumber };
        }
        break;
      }

      case 'CI64UV_COLORSCOUT': {
        const result = connectCi64UVDevice();
        if (result.res) {
          const ci64UVSerialNumber = getCi64UVSerialNumber();
          return { res: true, serialNumber: ci64UVSerialNumber };
        }
        break;
      }

      case 'EXACT': {
        const exactResult = connectExactDevice();
        if (exactResult.res) {
          const exactSerialNumber = getExactSerialNumber();
          return { res: true, serialNumber: exactSerialNumber };
        }
        break;
      }

      case 'EXACT2':
      case 'EXACT2_STRIPMODE': {
        const exact2Result = connectExact2Device();
        if (exact2Result.res) {
          const exact2SerialNumber = getExact2SerialNumber();
          return { res: true, serialNumber: exact2SerialNumber };
        }
        break;
      }

      case 'I1IO3': {
        const i1io3Result = openI1iO3Device();
        if (i1io3Result.res) {
          const i1IO3SerialNumber = getI1IO3SerialNumber();
          return { res: true, serialNumber: i1IO3SerialNumber };
        }
        break;
      }

      case 'I1IO2': {
        const i1ioResult = openI1IODevice();
        if (i1ioResult.res) {
          const i1IO2SerialNumber = getI1IOSerialNumber();
          return { res: true, serialNumber: i1IO2SerialNumber };
        }
        break;
      }

      case 'PRECISION_BALANCE': {
        const result = await connectPrecisionBalance();
        if (result.res) {
          const serialNumber = await getPBSerialNumber();
          return { res: true, serialNumber: serialNumber?.data };
        }
        break;
      }

      case 'CMA-ROP64E-UV':
      case 'CMA-ROP64E-UV_COLORSCOUT': {
        try {
          let result;
          if (connectionTypeROP) {
            result = await checkBluetoothConnection();
            if (result.res) {
              result = await getInformationDeviceWithBT();
            }
          } else {
            result = await checkCMAROP64EConnection();
            if (result.res) {
              result = await getInformationDevice();
            }
          }

          if (result.res) {
            return {
              res: true,
              serialNumber: connectionTypeROP
                ? result?.data?.serialNumber
                : result?.data,
            };
          }
        } catch (error) {
          console.error('Error:', error);
          return { res: false, error: error.message };
        }
        break;
      }

      //  {
      //   const result = await checkCMAROP64EConnection();
      //   if (result.res) {
      //     const serialNumber = await getInformationDevice();
      //     if (serialNumber.res) {
      //       return { res: true, serialNumber: serialNumber?.data };
      //     } else {
      //       break;
      //     }
      //   }
      //   break;
      // }

      case 'CMA-ROP64E-UV-BT': {
        // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
        const result = await checkBluetoothConnection();
        if (result.res) {
          const serialNumber = await getInformationDeviceWithBT();
          if (serialNumber.res) {
            return { res: true, serialNumber: result?.data?.serialNumber };
          }
        }
        break;
      }

      case 'label_printer': {
        const result = await checkLabelPrinterConnection();
        if (result.res) {
          return { res: true, serialNumber: 'cma-label-printer-2024' };
        }
        break;
      }

      case 'barcode_reader': {
        const result = await checkBarcodeScannerConnection();
        if (result.res) {
          return { res: true, serialNumber: 'cma-barcode-reader-2024' };
        }
        break;
      }

      default:
        return { res: false, serialNumber: null };
    }
    return { res: false, serialNumber: null };
  } catch (error) {
    return { res: false, serialNumber: null };
  }
};

// common function for handling multiple device settings
const handleSettingsRequest = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'I1PRO3':
      settingI1Pro3(content);
      break;

    case 'I1PRO3_STRIPMODE':
      settingI1Pro3StripMode(content);
      break;

    case 'I1PRO2':
      settingI1Pro2(content);
      break;

    case 'CI62':
      settingCi62(content);
      break;

    case 'CI62_COLORSCOUT':
      settingCi62(content);
      break;

    case 'EXACT':
      settingExact(content);
      break;

    case 'EXACT2':
      settingExact2(content);
      break;

    case 'EXACT2_STRIPMODE':
      settingExact2StripMode(content);
      break;

    case 'CI64':
      settingCi64(content);
      break;

    case 'CI64UV':
      settingCi64UV(content);
      break;

    case 'CI64_COLORSCOUT':
      settingCi64(content);
      break;

    case 'CI64UV_COLORSCOUT':
      settingCi64UV(content);
      break;

    case 'I1IO3':
      settingI1IO3(content);
      break;

    case 'I1IO2':
      settingI1IO(content);
      break;

    case 'CMA-ROP64E-UV':
    case 'CMA-ROP64E-UV_COLORSCOUT':
      {
        if (connectionTypeROP) {
          await settingSpectrometerWithBT(content);
        } else {
          await settingSpectrometer(content);
        }
      }
      break;

    case 'CMA-ROP64E-UV-BT':
      // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
      await settingSpectrometerWithBT(content);
      break;
    default:
      break;
  }
};

// common function for handling multiple device calibration
const handleCalibrationRequest = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'I1PRO3':
      calibrateI1Pro3(content);
      break;

    case 'I1PRO3_STRIPMODE':
      calibrateI1Pro3StripMode(content);
      break;

    case 'I1PRO2':
      calibrateI1Pro2(content);
      break;

    case 'CI62':
      calibrateCi62(content);
      break;

    case 'CI62_COLORSCOUT':
      calibrateCi62(content);
      break;

    case 'CI64':
      calibrateCi64(content);
      break;

    case 'CI64UV':
      calibrateCi64UV(content);
      break;

    case 'CI64_COLORSCOUT':
      calibrateCi64(content);
      break;

    case 'CI64UV_COLORSCOUT':
      calibrateCi64UV(content);
      break;

    case 'EXACT':
      calibrateExact(content);
      break;

    case 'EXACT2':
    case 'EXACT2_STRIPMODE': {
      calibrateExact2(content);
      break;
    }

    case 'I1IO3':
      calibratingI1IO3(content);
      break;

    case 'I1IO2':
      calibratingI1IO(content);
      break;

    case 'CMA-ROP64E-UV':
    case 'CMA-ROP64E-UV_COLORSCOUT':
      await calibrateSpectrometer(content);
      break;

    case 'CMA-ROP64E-UV-BT':
      // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
      await calibrateSpectrometer(content);
      break;

    default:
      break;
  }
};

// common function for handling multiple device measurement
const handleMeasurementRequest = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'I1PRO3':
      measureI1Pro3(content);
      break;

    case 'I1PRO3_STRIPMODE':
      measureI1Pro3StripMode(content);
      break;

    case 'I1PRO2':
      measureI1Pro2(content);
      break;

    case 'CI62':
      measureCi62(content);
      break;

    case 'CI62_COLORSCOUT':
      await measureColorScout(content);
      break;

    case 'CI64':
      measureCi64(content);
      break;

    case 'CI64UV':
      measureCi64UV(content);
      break;

    case 'CI64_COLORSCOUT':
      await measureColorScout(content);
      break;

    case 'CI64UV_COLORSCOUT':
      await measureColorScout(content);
      break;

    case 'EXACT':
      measureExact(content);
      break;

    case 'EXACT2':
      measureExact2(content);
      break;

    case 'EXACT2_STRIPMODE':
      await measureExact2StripMode(content);
      break;

    case 'I1IO3':
      measureI1iO3(content);
      break;

    case 'I1IO2':
      measureI1IO(content);
      break;

    case 'CMA-ROP64E-UV':
      {
        if (connectionTypeROP) {
          await measureROPWithBluetooth(content, macAddress);
        } else {
          await measureROPWithUSB(content);
        }
      }
      break;

    case 'CMA-ROP64E-UV_COLORSCOUT':
      // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
      await measureColorScout(content);
      break;

    case 'CMA-ROP64E-UV-BT':
      await measureROPWithBluetooth(content);
      break;
    default:
      break;
  }
};

// common function for handling multiple device Weight
const handleWeightRequest = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'PRECISION_BALANCE':
      weightPrecisionBalance(content);
      break;
  }
};

const handleResetDataForPB = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'PRECISION_BALANCE':
      resetPrecisionBalanceDevice(content);
      break;
  }
};

const handleGetTareValue = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'PRECISION_BALANCE':
      handleGetTareValueInDevice(content);
      break;
  }
};

const handleSetTareValue = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'PRECISION_BALANCE':
      handleSetTareValueInDevice(content);
      break;
  }
};

const handleZebraPrinter = async (args) => {
  try {
    const response = await handlePrintingProcess(args);
    args.zebra_data.isPrinted = response.res;
    args.zebra_data.error = response.error;
  } catch (error) {
    args.zebra_data.isPrinted = false;
    args.zebra_data.error = response.error || 'Unknown error occurred.';
  } finally {
    webSocketWorkerWindow.webContents.send(ZEBRA_PRINTER_HANDLER, args);
  }
};

const handleBarcodeReader = async (args) => {
  try {
    if (args.barCode_data.is_responed) {
      webSocketWorkerWindow.webContents.send(BAR_CODE_READER_HANDLER, args);
    } else if (currectOpenTab !== 3) {
      const data = {
        deviceConnection: {
          deviceType: 'barcode_reader',
          deviceName: 'barcode_reader',
          isConnected: false,
        },
        barCode_data: {
          isReaded: false,
          open_Url: '',
          deviceName: false,
          is_responed: false,
          error:
            'The Barcode Device tab is not open in the CMA-Connect application!!',
        },
      };
      webSocketWorkerWindow.webContents.send(BAR_CODE_READER_HANDLER, data);
    } else {
      mainWindow.webContents.send(SEND_OPEN_URL_TO_INPUT, args);
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

// common function for handling multiple device measurement
const handleGrabInitialPositionRequest = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'I1IO3':
      grabInitialPositionI1IO3Device(content);
      break;

    case 'I1IO2':
      grabInitialPositionI1IODevice(content);
      break;

    case 'CI62_COLORSCOUT':
      await grabInitialPositionColorScoutDevice(content);
      break;

    case 'CI64_COLORSCOUT':
      await grabInitialPositionColorScoutDevice(content);
      break;

    case 'CI64UV_COLORSCOUT':
      await grabInitialPositionColorScoutDevice(content);
      break;

    case 'CMA-ROP64E-UV_COLORSCOUT':
      // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
      await grabInitialPositionColorScoutDevice(content);
      break;

    default:
      break;
  }
};

// common function for handling multiple device measurement
const handleChartPositionRequest = async (content) => {
  switch (content.deviceConnection.deviceType) {
    case 'I1IO3':
      getChartPositionI1IO3Device(content);
      break;

    case 'I1IO2':
      getChartPositionI1IODevice(content);
      break;

    case 'CI62_COLORSCOUT':
      await getChartPositionColorScoutDevice(content);
      break;

    case 'CI64_COLORSCOUT':
      await getChartPositionColorScoutDevice(content);
      break;

    case 'CI64UV_COLORSCOUT':
      await getChartPositionColorScoutDevice(content);
      break;

    case 'CMA-ROP64E-UV_COLORSCOUT':
      // case 'CMA-ROP64E-UV-BT_COLORSCOUT':
      await getChartPositionColorScoutDevice(content);
      break;

    default:
      break;
  }
};

// function for setting on I1Pro3 device type
const settingI1Pro3 = (args) => {
  // call i1Pro3 setOptions function setDeviceOptions
  const res = setDeviceOptions(args?.settings?.options);
  if (!res) {
    args.error = printErrorInfo();
    if (args.error?.message.trim() == '') {
      args.error.message = 'Device setting options are not valid';
    }
  }
  args.settings.isSet = res;
  updateCurrentAction(`setting conditions complete : ${res}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for setting on I1Pro3StripMode device type
const settingI1Pro3StripMode = (args) => {
  // call i1Pro3 setOptions function setDeviceOptionsStripMode
  const res = setDeviceOptionsStripMode(args?.settings?.options);
  if (!res) {
    args.error = printErrorInfo();
    if (args.error?.message.trim() == '') {
      args.error.message = 'Device setting options are not valid';
    }
  }
  args.settings.isSet = res;
  updateCurrentAction(`setting conditions complete : ${res}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for calibration I1Pro3 device type
const calibrateI1Pro3 = (args) => {
  updateCurrentAction('Calibrating Device...');
  const res = calibrateDevice();
  if (!res) {
    args.error = printErrorInfo();
  }
  args.calibration.hasCalibrated = res;
  if (res) {
    updateCurrentAction(`calibration complete`);
  } else {
    updateCurrentAction(`calibration failed`);
  }
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
  mainWindow.webContents.send(REFRESH_DEVICES_AND_LICENSES, null);
};

// function for calibration I1Pro3StripMode device type
const calibrateI1Pro3StripMode = (args) => {
  updateCurrentAction('Calibrating Device...');
  const res = calibrateDeviceStripMode();
  if (!res) {
    args.error = printErrorInfo();
  }
  args.calibration.hasCalibrated = res;
  if (res) {
    updateCurrentAction(`calibration complete`);
  } else {
    updateCurrentAction(`calibration failed`);
  }
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
  mainWindow.webContents.send(REFRESH_DEVICES_AND_LICENSES, null);
};

// function for taking measurement on I1Pro3 device type
const measureI1Pro3 = async (args) => {
  updateCurrentAction('Taking Measurement...');
  updateCurrentAction('measurement waiting for button press...');
  // return back first call
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  const measRes = await triggerAvgMeasurement();
  args.measurement.hasMeasured = measRes.res;
  if (measRes.res) {
    clearTimeout(deviceMeasurementTimeout);
    args.measurement.measurementData = measRes.measData;
    updateCurrentAction(`measurement complete`);
  } else if (deviceMeasurementTimeout == 0) {
    args = { type: 'requestTimeout' };
    deviceMeasurementTimeout = null; // reset to initial state
  } else {
    clearTimeout(deviceMeasurementTimeout);
    args.error = { message: measRes.error };
    updateCurrentAction(`measurement failed`);
  }
  webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
};

// function for taking measurement on I1Pro3 StripMode device type
const measureI1Pro3StripMode = async (args) => {
  updateCurrentAction('Taking Measurement...');
  updateCurrentAction('measurement waiting for button press...');
  // return back first call
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 10,
  );
  const measRes = await triggerAvgMeasurementStripMode(
    args.measurement.numOfPatches,
  );
  args.measurement.hasMeasured = measRes.res;
  if (measRes.res) {
    clearTimeout(deviceMeasurementTimeout);
    args.measurement.measurementData = measRes.measData;
    updateCurrentAction(`measurement complete`);
  } else if (deviceMeasurementTimeout == 0) {
    args = { type: 'requestTimeout' };
    deviceMeasurementTimeout = null; // reset to initial state
  } else {
    clearTimeout(deviceMeasurementTimeout);
    args.error = { message: measRes.error };
    updateCurrentAction(`measurement failed`);
  }
  webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
};

// function for setting Ci62 device type
const settingCi62 = (args) => {
  const result = setCi62DeviceConfiguration(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for calibration Ci62 device type
const calibrateCi62 = (args) => {
  const res = checkCi62Calibration();
  args.calibration.hasCalibrated = res;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function for taking measurement on Ci62 device type
const measureCi62 = (args) => {
  updateCurrentAction('waiting for measurement to complete...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  waitForCi62MeasurementComplete((resMsg) => {
    if (resMsg.res) {
      clearTimeout(deviceMeasurementTimeout);
      const result = getCi62MeasurementData();
      if (result.res) {
        args.measurement.hasMeasured = true;
        if (result.hasOwnProperty('SPINREFData')) {
          args.measurement.measurementData = {
            SPINREFData: result.SPINREFData,
            SPINLABData: result.SPINLABData,
            SPEXREFData: result.SPEXREFData,
            SPEXLABData: result.SPEXLABData,
          };
        } else {
          args.measurement.measurementData = {
            spectrumData: result.reflectanceData,
            LABData: result.LABData,
          };
        }
        updateCurrentAction(`measurement complete`);
      } else {
        args.measurement.hasMeasured = false;
        args.error = { message: result.error };
        updateCurrentAction(`measurement failed`);
      }
    } else if (deviceMeasurementTimeout == 0) {
      args = { type: 'requestTimeout' };
      deviceMeasurementTimeout = null; // reset to initial state
    } else {
      clearTimeout(deviceMeasurementTimeout);
      args.measurement.hasMeasured = false;
      args.error = { message: resMsg.error };
      updateCurrentAction(`measurement failed`);
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
  });
};

// function for calibration eXact device type
const calibrateExact = (args) => {
  const res = checkExactCalibration();
  args.calibration.hasCalibrated = res;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function for calibration eXact2 device type
const calibrateExact2 = (args) => {
  const res = checkExact2Calibration();
  args.calibration.hasCalibrated = res;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function for exact device settings
const settingExact = (args) => {
  const result = setExactDeviceConfiguration(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for exact2 device settings
const settingExact2 = (args) => {
  const result = setExact2DeviceConfiguration(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for exact2 Strip Mode device settings
const settingExact2StripMode = (args) => {
  const result = setExact2DeviceConfigurationStripMode(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for taking measurement on Exact device type
const measureExact = (args) => {
  updateCurrentAction('waiting for measurement to complete...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  waitForExactMeasurementComplete((result) => {
    if (result.res) {
      clearTimeout(deviceMeasurementTimeout);
      var result = getExactAvgMeasurementData();
      if (result.res) {
        args.measurement.hasMeasured = true;
        args.measurement.measurementData = result.measData;
        updateCurrentAction(`measurement complete`);
      } else {
        args.measurement.hasMeasured = false;
        args.error = { message: result.error };
        updateCurrentAction(`measurement failed `);
      }
    } else if (deviceMeasurementTimeout == 0) {
      args = { type: 'requestTimeout' };
      deviceMeasurementTimeout = null; // reset to initial state
    } else {
      clearTimeout(deviceMeasurementTimeout);
      args.measurement.hasMeasured = false;
      args.error = { message: result.error };
      updateCurrentAction(`measurement failed`);
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
  });
};

// function for taking measurement on Exact2 device type
const measureExact2 = (args) => {
  updateCurrentAction('waiting for measurement to complete...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  waitForExact2MeasurementComplete((result) => {
    if (result.res) {
      clearTimeout(deviceMeasurementTimeout);
      var result = getExact2AvgMeasurementData();
      if (result.res) {
        args.measurement.hasMeasured = true;
        args.measurement.measurementData = result.measData;
        updateCurrentAction(`measurement complete`);
      } else {
        args.measurement.hasMeasured = false;
        args.error = { message: result.error };
        updateCurrentAction(`measurement failed `);
      }
    } else if (deviceMeasurementTimeout == 0) {
      args = { type: 'requestTimeout' };
      deviceMeasurementTimeout = null; // reset to initial state
    } else {
      clearTimeout(deviceMeasurementTimeout);
      args.measurement.hasMeasured = false;
      args.error = { message: result.error };
      updateCurrentAction(`measurement failed`);
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
  });
};

// function for taking Strip measurement (Scan) on Exact2 device type
const measureExact2StripMode = async (args) => {
  updateCurrentAction('waiting for measurement to complete...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  const measRes = await getExact2AvgMeasurementDataStripMode(
    args.measurement.numOfPatches,
    args.measurement.patchWidth,
  );
  args.measurement.hasMeasured = measRes.res;
  if (measRes.res) {
    clearTimeout(deviceMeasurementTimeout);
    args.measurement.measurementData = measRes.measData;
    updateCurrentAction(`measurement complete`);
  } else if (deviceMeasurementTimeout == 0) {
    args = { type: 'requestTimeout' };
    deviceMeasurementTimeout = null; // reset to initial state
  } else {
    clearTimeout(deviceMeasurementTimeout);
    args.error = { message: measRes.error };
    updateCurrentAction(`measurement failed`);
  }
  webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
};

// function to setOptions for i1io3 device
const settingI1IO3 = (args) => {
  const result = setI1IO3Options(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function to setOptions for i1io3 device
const calibratingI1IO3 = (args) => {
  updateCurrentAction(`calibrating..`);
  const calRes = calibrateI1IO3Device();
  updateCurrentAction(`calibration complete : ${calRes.res}`);
  args.calibration.hasCalibrated = calRes.res;
  if (!calRes.res) args.error = calRes.error;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function to grabInitialPosition for i1io3 device
const grabInitialPositionI1IO3Device = (args) => {
  updateCurrentAction('Grabbing initial position');
  const initPosRes = grabInitialPositionI1IO3();

  if (!initPosRes.res) updateCurrentAction('Error Grabbing initial position');
  else updateCurrentAction('Grabbing initial position complete');

  args.grabInitialPosition.hasGrabbed = initPosRes.res;
  if (!initPosRes.res) args.error = initPosRes.error;
  webSocketWorkerWindow.webContents.send(GRAB_INITIAL_POSITION, args);
};

const getI1IO3PositionForIndex = (index) => {
  if (index === 1) {
    updateCurrentAction('Getting top-left chart position...');
    const postRes = getTopLeftChartPositionI1IO3();
    if (postRes.res)
      updateCurrentAction('Getting top-left chart position done ');
    else updateCurrentAction('Getting top-left chart position failed ');
    return postRes;
  }
  if (index === 2) {
    updateCurrentAction('Getting bottom-left chart position...');
    const postRes = getBottomLeftChartPositionI1IO3();
    if (postRes.res)
      updateCurrentAction('Getting bottom-left chart position done ');
    else updateCurrentAction('Getting bottom-left chart position failed ');
    return postRes;
  }
  if (index === 3) {
    updateCurrentAction('Getting bottom-right chart position...');
    const postRes = getBottomRightChartPositionI1IO3();
    if (postRes.res)
      updateCurrentAction('Getting bottom-right chart position done ');
    else updateCurrentAction('Getting bottom-right chart position failed ');
    return postRes;
  }
  updateCurrentAction('Chart position not valid');
  return {
    res: false,
    error: { errorNo: null, message: 'Chart position not valid' },
  };
};

// wait for the i1io3 button click to get position
const waitForTheI1IO3PositionGetForIndex = (index) =>
  new Promise((resolve, reject) => {
    if (index === 1) {
      updateCurrentAction(
        'Move the visor to the center of the first field in the first row and press the i1Pro3 button when ready (top-left)',
      );
    }
    if (index === 2) {
      updateCurrentAction(
        'Move the visor to the center of the first field in the last row and press the i1Pro3 button when ready (bottom-left)',
      );
    }
    if (index === 3) {
      updateCurrentAction(
        'Move the visor to the center of the last field in the last row and press the i1Pro3 button when ready (bottom-right)',
      );
    }

    clearTimeout(deviceMeasurementTimeout);
    deviceMeasurementTimeout = setTimeout(
      () => {
        const measStatus = getDeviceMeasureStatus('I1IO3');
        if (measStatus) {
          deviceMeasurementTimeout = null;
          updateDeviceMeasureFlag('I1IO3', false);
          updateCurrentAction('measurement Timed-out... please try again');
        }
      },
      1000 * 60 * 5,
    );

    waitForButtonPressedI1IO3((result) => {
      clearTimeout(deviceMeasurementTimeout);
      if (result.res) {
        resolve(getI1IO3PositionForIndex(index));
      } else {
        resolve(result);
      }
    });
  });

// function to get chart position for i1io3 device
const getChartPositionI1IO3Device = async (args) => {
  const posRes = await waitForTheI1IO3PositionGetForIndex(
    args.chartPosition.position,
  );
  args.chartPosition.hasTaken = posRes.res;
  if (!posRes.res) args.error = posRes.error;
  webSocketWorkerWindow.webContents.send(CHART_POSITION, args);
};

// function for taking measurement by scanning for whole chart on i1iO3 device type from equipment app
const measureI1iO3 = (args) => {
  try {
    let measurementDataJson = {};
    const { column, row, patchGap, patchesToIgnoreInLastRow } = args.chartInfo;
    const isAllNumbers = Object.values(args.chartInfo).every(
      (x) => typeof x === 'number',
    );
    if (isAllNumbers) {
      updateCurrentAction('Scanning Chart...');
      const scanRes = scanChartAutomaticI1IO3(
        row,
        column,
        patchGap,
        patchesToIgnoreInLastRow,
      );
      args.measurement.hasMeasured = scanRes.res;

      if (scanRes.res) {
        updateCurrentAction('Scanning Chart Completed ');
        const fileRes = getOutputFileDataI1IO3();
        args.error = { message: fileRes.error };
        args.measurement.hasMeasured = fileRes.res;
        args.measurement.measurementData = fileRes.data;
        measurementDataJson = getMeasDataFromOutputFilesI1IO3();
      } else {
        let error = 'Scanning Failed';
        if (
          scanRes.error &&
          scanRes.error.message &&
          scanRes.error.message !== ''
        ) {
          error = scanRes.error.message;
        }
        updateCurrentAction(`Scanning Chart Failed : ${error}`);
        args.error = {
          message: error,
        };
        args.measurement.measurementData = null;
      }
    } else {
      updateCurrentAction('Invalid Chart Information');
      args.measurement.hasMeasured = false;
      args.error = { message: 'Invalid Chart Information' };
      args.measurement.measurementData = null;
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
    args.measurement.measurementData = measurementDataJson;
    // send data back to main windows to show scanned response data
    mainWindow.webContents.send(SCAN_MEASUREMENT_RES, args);
  } catch (error) {
    updateCurrentAction(`Error scanning chart : ${error.message}`);
    args.measurement.hasMeasured = false;
    args.error = { message: error.message };
    args.measurement.measurementData = null;
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
    mainWindow.webContents.send(SCAN_MEASUREMENT_RES, args);
  }
  // resetting measurement string
  resetMeasStringI1IO3();
};

// === I1IO ===
// function to setOptions for i1io device
const settingI1IO = (args) => {
  const result = setI1IOOptions(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function to setOptions for i1io device
const calibratingI1IO = (args) => {
  updateCurrentAction(`calibrating..`);
  const calRes = calibrateI1IODevice();
  updateCurrentAction(`calibration complete : ${calRes.res}`);
  args.calibration.hasCalibrated = calRes.res;
  if (!calRes.res) args.error = calRes.error;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function to grabInitialPosition for i1io device
const grabInitialPositionI1IODevice = (args) => {
  updateCurrentAction('Grabbing initial position');
  const initPosRes = grabInitialPositionI1IO();

  if (!initPosRes.res) updateCurrentAction('Error Grabbing initial position');
  else updateCurrentAction('Grabbing initial position complete');

  args.grabInitialPosition.hasGrabbed = initPosRes.res;
  if (!initPosRes.res) args.error = initPosRes.error;
  webSocketWorkerWindow.webContents.send(GRAB_INITIAL_POSITION, args);
};

const getI1IOPositionForIndex = (index) => {
  if (index === 1) {
    updateCurrentAction('Getting top-left chart position...');
    const postRes = getTopLeftChartPositionI1IO();
    if (postRes.res)
      updateCurrentAction('Getting top-left chart position done ');
    else updateCurrentAction('Getting top-left chart position failed ');
    return postRes;
  }
  if (index === 2) {
    updateCurrentAction('Getting bottom-left chart position...');
    const postRes = getBottomLeftChartPositionI1IO();
    if (postRes.res)
      updateCurrentAction('Getting bottom-left chart position done ');
    else updateCurrentAction('Getting bottom-left chart position failed ');
    return postRes;
  }
  if (index === 3) {
    updateCurrentAction('Getting bottom-right chart position...');
    const postRes = getBottomRightChartPositionI1IO();
    if (postRes.res)
      updateCurrentAction('Getting bottom-right chart position done ');
    else updateCurrentAction('Getting bottom-right chart position failed ');
    return postRes;
  }
  updateCurrentAction('Chart position not valid');
  return {
    res: false,
    error: { errorNo: null, message: 'Chart position not valid' },
  };
};

// wait for the i1io button click to get position
const waitForTheI1IOPositionGetForIndex = (index) =>
  new Promise((resolve, reject) => {
    if (index === 1) {
      updateCurrentAction(
        'Move the visor to the center of the first field in the first row and press the i1Pro2 button when ready (top-left)',
      );
    }
    if (index === 2) {
      updateCurrentAction(
        'Move the visor to the center of the first field in the last row and press the i1Pro2 button when ready (bottom-left)',
      );
    }
    if (index === 3) {
      updateCurrentAction(
        'Move the visor to the center of the last field in the last row and press the i1Pro2 button when ready (bottom-right)',
      );
    }

    clearTimeout(deviceMeasurementTimeout);
    deviceMeasurementTimeout = setTimeout(
      () => {
        const measStatus = getDeviceMeasureStatus('I1IO');
        if (measStatus) {
          deviceMeasurementTimeout = null;
          updateDeviceMeasureFlag('I1IO', false);
          updateCurrentAction('measurement Timed-out... please try again');
        }
      },
      1000 * 60 * 5,
    );

    waitForButtonPressedI1IO((result) => {
      clearTimeout(deviceMeasurementTimeout);
      if (result.res) {
        resolve(getI1IOPositionForIndex(index));
      } else {
        resolve(result);
      }
    });
  });

// function to get chart position for i1io device
const getChartPositionI1IODevice = async (args) => {
  const posRes = await waitForTheI1IOPositionGetForIndex(
    args.chartPosition.position,
  );
  args.chartPosition.hasTaken = posRes.res;
  if (!posRes.res) args.error = posRes.error;
  webSocketWorkerWindow.webContents.send(CHART_POSITION, args);
};

// function for taking measurement by scanning for whole chart on i1iO3 device type from equipment app
const measureI1IO = (args) => {
  try {
    let measurementDataJson = {};
    const { column, row, patchGap, patchesToIgnoreInLastRow } = args.chartInfo;
    const isAllNumbers = Object.values(args.chartInfo).every(
      (x) => typeof x === 'number',
    );
    if (isAllNumbers) {
      updateCurrentAction('Scanning Chart...');
      const scanRes = scanChartAutomaticI1IO(
        row,
        column,
        patchGap,
        patchesToIgnoreInLastRow,
      );
      args.measurement.hasMeasured = scanRes.res;

      if (scanRes.res) {
        updateCurrentAction('Scanning Chart Completed ');
        const fileRes = getOutputFileDataI1IO();
        args.error = { message: fileRes.error };
        args.measurement.hasMeasured = fileRes.res;
        args.measurement.measurementData = fileRes.data;
        measurementDataJson = getMeasDataFromOutputFilesI1IO();
      } else {
        let error = 'Scanning Failed';
        if (
          scanRes.error &&
          scanRes.error.message &&
          scanRes.error.message !== ''
        ) {
          error = scanRes.error.message;
        }
        updateCurrentAction(`Scanning Chart Failed : ${error}`);
        args.error = {
          message: error,
        };
        args.measurement.measurementData = null;
      }
    } else {
      updateCurrentAction('Invalid Chart Information');
      args.measurement.hasMeasured = false;
      args.error = { message: 'Invalid Chart Information' };
      args.measurement.measurementData = null;
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
    args.measurement.measurementData = measurementDataJson;
    // send data back to main windows to show scanned response data
    mainWindow.webContents.send(SCAN_MEASUREMENT_RES, args);
  } catch (error) {
    updateCurrentAction(`Error scanning chart : ${error.message}`);
    args.measurement.hasMeasured = false;
    args.error = { message: error.message };
    args.measurement.measurementData = null;
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
    mainWindow.webContents.send(SCAN_MEASUREMENT_RES, args);
  }
  // resetting measurement string
  resetMeasStringI1IO();
};

// function to grabInitialPosition for ColorScout device
const grabInitialPositionColorScoutDevice = async (args) => {
  updateCurrentAction('Grabbing initial position');
  const initPosRes = await grabInitialPositionColorScout(args);

  const finalRes = {
    res: initPosRes.res,
    error: { message: initPosRes.error },
  };

  if (!initPosRes.res) updateCurrentAction('Error Grabbing initial position');
  else updateCurrentAction('Grabbing initial position complete');

  args.grabInitialPosition.hasGrabbed = finalRes.res;
  if (!initPosRes.res) args.error = finalRes.error;
  webSocketWorkerWindow.webContents.send(GRAB_INITIAL_POSITION, args);
};

const waitForTheColorScoutPositionGetForIndex = async (
  index,
  typeOfDevice,
  row,
) =>
  new Promise(async (resolve, reject) => {
    if (index === 1) {
      updateCurrentAction(
        'Move the ColorScout to the center of the first field in the first row and press the ENTER button when ready (top-left)',
      );
    }
    if (index === 2) {
      updateCurrentAction(
        'Move the ColorScout to the center of the first field in the last row and press the ENTER button when ready (bottom-left)',
      );
    }
    if (index === 3) {
      updateCurrentAction(
        'Move the ColorScout to the center of the last field in the last row and press the ENTER button when ready (bottom-right)',
      );
    }

    clearTimeout(deviceMeasurementTimeout);
    deviceMeasurementTimeout = setTimeout(
      () => {
        const measStatus = getDeviceMeasureStatus('COLORSCOUT');
        if (measStatus) {
          deviceMeasurementTimeout = null;
          updateDeviceMeasureFlag('COLORSCOUT', false);
          updateCurrentAction('measurement Timed-out... please try again');
        }
      },
      1000 * 60 * 5,
    );

    updateDeviceMeasureFlag('COLORSCOUT', true);
    const result = await waitForButtonPressedColorScout(
      index,
      typeOfDevice,
      row,
    );
    updateDeviceMeasureFlag('COLORSCOUT', false);
    clearTimeout(deviceMeasurementTimeout);
    resolve({ res: result.res, error: { message: result.error } });
  });

// function to get chart position for i1io device
const getChartPositionColorScoutDevice = async (args) => {
  const posRes = await waitForTheColorScoutPositionGetForIndex(
    args.chartPosition.position,
    args.deviceConnection.deviceType,
    args.chartPosition.row,
  );
  args.chartPosition.hasTaken = posRes.res;
  if (!posRes.res) args.error = posRes.error;
  webSocketWorkerWindow.webContents.send(CHART_POSITION, args);
};

// function for taking measurement by scanning for whole chart on COLORSCOUT device type from equipment app
const measureColorScout = async (args) => {
  console.log(
    '🚀 ~ file: main.js:2766 ~ measureColorScout ~ args:',
    args.settings,
  );
  try {
    const {
      column,
      row,
      patchGap,
      patchesToIgnoreInLastRow,
      patchWidth,
      patchHeight,
    } = args.chartInfo;
    const isAllNumbers = Object.values(args.chartInfo).every(
      (x) => typeof x === 'number',
    );
    if (isAllNumbers) {
      updateCurrentAction('Scanning Chart...');
      updateColorScoutStartMeasure(true);
      const scanRes = await scanChartAutomaticColorScout(
        args.deviceConnection.deviceType,
        row,
        column,
        patchGap,
        patchesToIgnoreInLastRow,
        patchWidth,
        patchHeight,
        args?.settings,
      );
      updateColorScoutStartMeasure(false);
      args.measurement.hasMeasured = scanRes.res;

      if (scanRes.res) {
        const isColorScout =
          args.deviceConnection.deviceType === 'CMA-ROP64E-UV_COLORSCOUT';
        const isColorScoutBT =
          args.deviceConnection.deviceType === 'CMA-ROP64E-UV-BT_COLORSCOUT';
        updateCurrentAction('Scanning Chart Completed');
        if (isColorScout || isColorScoutBT) {
          const fileRes = await loadDataFromCSV();
          args.error = { message: fileRes.error };
          args.measurement.hasMeasured = fileRes.res;
          args.measurement.measurementData = fileRes.data;
        } else {
          const fileRes = await getOutputFileDataColoScout(
            args.deviceConnection.deviceType,
            row,
            column,
            patchesToIgnoreInLastRow,
          );
          args.error = { message: fileRes.error };
          args.measurement.hasMeasured = fileRes.res;
          args.measurement.measurementData = fileRes.data;
        }
      } else {
        const error =
          scanRes.error && scanRes.error !== ''
            ? scanRes.error
            : 'Scanning Failed';
        updateCurrentAction(`Scanning Chart Failed : ${error}`);
        args.error = { message: error };
        args.measurement.measurementData = null;
      }
    } else {
      updateCurrentAction('Invalid Chart Information');
      args.measurement.hasMeasured = false;
      args.error = { message: 'Invalid Chart Information' };
      args.measurement.measurementData = null;
    }
    console.log('🚀 ~ file: main.js:2843 ~ measureColorScout ~ args:', args);
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
    // send data back to main windows to show scanned response data
    mainWindow.webContents.send(SCAN_MEASUREMENT_RES, args);
  } catch (error) {
    updateCurrentAction(`Error scanning chart : ${error.message}`);
    args.measurement.hasMeasured = false;
    args.error = { message: error.message };
    args.measurement.measurementData = null;
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
    mainWindow.webContents.send(SCAN_MEASUREMENT_RES, args);
  }
};

// function for setting Ci64 device type
const settingCi64 = (args) => {
  args.settings.isSet = true;
  const result = setCi64DeviceConfiguration(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for calibration Ci64 device type
const calibrateCi64 = (args) => {
  const res = checkCi64Calibration();
  args.calibration.hasCalibrated = res;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function for taking measurement on Ci64 device type
const measureCi64 = (args) => {
  updateCurrentAction('waiting for measurement to complete...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  waitForCi64MeasurementComplete((resMsg) => {
    if (resMsg.res) {
      clearTimeout(deviceMeasurementTimeout);
      const result = getCi64MeasurementData();
      if (result.res) {
        args.measurement.hasMeasured = true;
        if (result.hasOwnProperty('SPINREFData')) {
          args.measurement.measurementData = {
            SPINREFData: result.SPINREFData,
            SPINLABData: result.SPINLABData,
            SPEXREFData: result.SPEXREFData,
            SPEXLABData: result.SPEXLABData,
          };
        } else {
          args.measurement.measurementData = {
            spectrumData: result.reflectanceData,
            LABData: result.LABData,
          };
        }
        updateCurrentAction(`measurement complete `);
      } else {
        args.measurement.hasMeasured = false;
        args.error = { message: result.error };
        updateCurrentAction(`measurement failed `);
      }
    } else if (deviceMeasurementTimeout == 0) {
      args = { type: 'requestTimeout' };
      deviceMeasurementTimeout = null; // reset to initial state
    } else {
      clearTimeout(deviceMeasurementTimeout);
      args.measurement.hasMeasured = false;
      args.error = { message: resMsg.error };
      updateCurrentAction(`measurement failed `);
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
  });
};

// function for setting Ci64UV device type
const settingCi64UV = (args) => {
  args.settings.isSet = true;
  const result = setCi64UVDeviceConfiguration(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for calibration Ci64UV device type
const calibrateCi64UV = (args) => {
  const res = checkCi64UVCalibration();
  args.calibration.hasCalibrated = res;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function for taking measurement on Ci64UV device type
const measureCi64UV = (args) => {
  updateCurrentAction('waiting for measurement to complete...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  waitForCi64UVMeasurementComplete((resMsg) => {
    if (resMsg.res) {
      clearTimeout(deviceMeasurementTimeout);
      const result = getCi64UVMeasurementData();
      if (result.res) {
        args.measurement.hasMeasured = true;
        if (result.hasOwnProperty('SPINREFData')) {
          args.measurement.measurementData = {
            SPINREFData: result.SPINREFData,
            SPINLABData: result.SPINLABData,
            SPEXREFData: result.SPEXREFData,
            SPEXLABData: result.SPEXLABData,
          };
        } else {
          args.measurement.measurementData = {
            spectrumData: result.reflectanceData,
            LABData: result.LABData,
          };
        }
        updateCurrentAction(`measurement complete `);
      } else {
        args.measurement.hasMeasured = false;
        args.error = { message: result.error };
        updateCurrentAction(`measurement failed `);
      }
    } else if (deviceMeasurementTimeout == 0) {
      args = { type: 'requestTimeout' };
      deviceMeasurementTimeout = null; // reset to initial state
    } else {
      clearTimeout(deviceMeasurementTimeout);
      args.measurement.hasMeasured = false;
      args.error = { message: resMsg.error };
      updateCurrentAction(`measurement failed `);
    }
    webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
  });
};

// seting
const settingSpectrometer = async (args) => {
  const result = await settingSpectrometerOptions(args?.settings?.options);
  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// seting
const settingSpectrometerWithBT = async (args) => {
  const result = await setSpectrometerOptions(
    args?.settings?.options,
    macAddress,
  );

  if (!result.res) {
    args.error = { message: result.error };
  }
  args.settings.isSet = result.res;
  updateCurrentAction(`setting conditions complete : ${true}`);

  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for calibration Spectrometer device type
const calibrateSpectrometer = async (args) => {
  const result = await calibrateSpectrometerDevice();
  args.calibration.hasCalibrated = result.res;
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
};

// function for measure Spectrometer device type with USB
const measureROPWithUSB = async (measurementArgs) => {
  console.log(
    '🚀 ~ file: main.js:3183 ~ measureROPWithUSB ~ measurementArgs:',
    measurementArgs,
  );
  try {
    updateCurrentAction('Waiting for measurement to complete via USB...');
    clearTimeout(deviceMeasurementTimeout);

    deviceMeasurementTimeout = setTimeout(
      () => {
        deviceMeasurementTimeout = 0;
        updateDeviceMeasureFlag(
          measurementArgs.deviceConnection.deviceType,
          false,
        );
        updateCurrentAction('Measurement timeout...');
      },
      1000 * 60 * 5,
    );

    const { settings } = measurementArgs;
    const isManuallyMeasured = settings.measurement_type === 'manually';
    const measurementFunction = isManuallyMeasured
      ? measureDeviceManually
      : measureDeviceAutomatic;

    updateCurrentAction(
      `Waiting for ${
        isManuallyMeasured ? 'manually' : 'automatic'
      } measurement to complete via USB...`,
    );

    if (settings.MeasAverageNum) {
      const lastMeasurementResult = [];
      for (
        let index = 0;
        index < parseInt(settings.MeasAverageNum, 10);
        index++
      ) {
        const result = await measurementFunction(settings);
        if (result.res) {
          lastMeasurementResult.push(result.data); // Store the last value
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const averages = await calculateAverages(lastMeasurementResult);
      handleMeasurementResult(averages, measurementArgs);
    }

    console.log(
      '🚀 ~ file: main.js:3213 ~ measureROPWithUSB ~ measurementArgs:',
      measurementArgs,
    );
    webSocketWorkerWindow.webContents.send(MEASUREMENT, measurementArgs);
  } catch (error) {
    handleMeasurementError(error, measurementArgs);
  }
};

// function for measure Spectrometer device type with Bluetooth
const measureROPWithBluetooth = async (measurementArgs) => {
  console.log(
    '🚀 ~ file: main.js:3246 ~ measureROPWithBluetooth ~ measurementArgs:',
    measurementArgs,
  );
  try {
    updateCurrentAction('Waiting for measurement to complete via Bluetooth...');
    clearTimeout(deviceMeasurementTimeout);

    deviceMeasurementTimeout = setTimeout(
      () => {
        deviceMeasurementTimeout = 0;
        updateDeviceMeasureFlag(
          measurementArgs.deviceConnection.deviceType,
          false,
        );
        updateCurrentAction('Measurement timeout...');
      },
      1000 * 60 * 5,
    );

    const { settings } = measurementArgs;
    const isManuallyMeasured = settings.measurement_type === 'manually';
    const measurementFunction = isManuallyMeasured
      ? measureDeviceManuallyWithBT
      : measureDeviceAutomaticWithBT;

    updateCurrentAction(
      `Waiting for ${
        isManuallyMeasured ? 'manually' : 'automatic'
      } measurement to complete via Bluetooth...`,
    );

    if (settings.MeasAverageNum) {
      const lastMeasurementResult = [];
      for (
        let index = 0;
        index < parseInt(settings.MeasAverageNum, 10);
        index++
      ) {
        const result = await measurementFunction(settings, macAddress);
        if (result.res) {
          lastMeasurementResult.push(result.data); // Store the last value
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const averages = await calculateAverages(lastMeasurementResult);
      handleMeasurementResult(averages, measurementArgs);
    }

    console.log(
      '🚀 ~ file: main.js:3285 ~ measureROPWithBluetooth ~ measurementArgs:',
      measurementArgs,
    );
    webSocketWorkerWindow.webContents.send(MEASUREMENT, measurementArgs);
  } catch (error) {
    handleMeasurementError(error, measurementArgs);
  }
};

const handleMeasurementResult = (result, measurementArgs) => {
  if (result.res) {
    clearTimeout(deviceMeasurementTimeout);
    measurementArgs.measurement.hasMeasured = true;
    measurementArgs.measurement.measurementData = result.data;
    updateCurrentAction('Measurement Complete.');
  } else {
    measurementArgs.measurement.hasMeasured = false;
    measurementArgs.error = { message: result.error || 'Measurement failed' };
    updateCurrentAction('Measurement failed.');
  }
};

const handleMeasurementError = (error, measurementArgs) => {
  measurementArgs.measurement.hasMeasured = false;
  measurementArgs.error = {
    message: error.message || 'An error occurred during measurement',
  };
  updateCurrentAction(`Measurement failed: ${error.message}`);
  webSocketWorkerWindow.webContents.send(MEASUREMENT, measurementArgs);
};

// function for setting on I1Pro device type
const settingI1Pro2 = (args) => {
  // call i1Pro setOptions function setDeviceOptions
  const setOps = setI1ProDeviceOptions(args?.settings?.options);
  if (!setOps.res) {
    args.error = printErrorInfo();
    if (args.error?.message.trim() == '') {
      args.error.message = 'Device setting options are not valid ';
    }
  }
  args.settings.isSet = setOps.res;
  updateCurrentAction(`setting conditions complete : ${setOps.res}`);
  webSocketWorkerWindow.webContents.send(SETTINGS, args);
};

// function for calibration I1Pro device type
const calibrateI1Pro2 = (args) => {
  updateCurrentAction('waiting for button press...');
  // call i1Pro calibration function either calibrateReflectanceMode() or calibrateReflectanceM3Mode()
  const calRes = calibrateI1ProDevice();
  if (!calRes.res) {
    args.error = { message: calRes.error };
  }
  args.calibration.hasCalibrated = calRes.res;
  if (calRes.res) {
    updateCurrentAction(`calibration complete `);
  } else {
    updateCurrentAction(`calibration failed `);
  }
  webSocketWorkerWindow.webContents.send(CALIBRATION, args);
  mainWindow.webContents.send(REFRESH_DEVICES_AND_LICENSES, null);
  // });
};

// function for taking measurement on I1Pro device type
const measureI1Pro2 = async (args) => {
  updateCurrentAction('Taking Measurement...');
  updateCurrentAction('measurement waiting for button press...');
  clearTimeout(deviceMeasurementTimeout);
  deviceMeasurementTimeout = setTimeout(
    () => {
      deviceMeasurementTimeout = 0;
      updateDeviceMeasureFlag(args.deviceConnection.deviceType, false);
      updateCurrentAction('measurement timeout...');
    },
    1000 * 60 * 5,
  );
  const measRes = await triggerI1ProAvgMeasurement();
  args.measurement.hasMeasured = measRes.res;
  if (measRes.res) {
    clearTimeout(deviceMeasurementTimeout);
    args.measurement.measurementData = measRes.measData;
    updateCurrentAction(`measurement complete `);
  } else if (deviceMeasurementTimeout == 0) {
    args = { type: 'requestTimeout' };
    deviceMeasurementTimeout = null; // reset to initial state
  } else {
    clearTimeout(deviceMeasurementTimeout);
    args.error = measRes.error;
    updateCurrentAction(`measurement failed `);
  }
  webSocketWorkerWindow.webContents.send(MEASUREMENT, args);
};

// common function to change measure flag
const updateDeviceMeasureFlag = (device, status) => {
  switch (device) {
    case 'I1PRO3':
    case 'I1PRO3_STRIPMODE':
      updateI1PRO3StartMeasure(status);
      break;

    case 'I1PRO2':
      updateI1PROStartMeasure(status);
      break;

    case 'CI62':
      updateCI62StartMeasure(status);
      break;

    case 'CI64':
      updateCI64StartMeasure(status);
      break;

    case 'CI64UV':
      updateCI64UVStartMeasure(status);
      break;

    case 'COLORSCOUT':
      updateColorScoutStartMeasure(status);
      break;

    case 'EXACT':
      updateExactStartMeasure(status);
      break;

    case 'EXACT2':
    case 'EXACT2_STRIPMODE':
      updateExact2StartMeasure(status);
      break;

    case 'I1IO3':
      updateI1IO3StartMeasure(status);
      break;

    default:
      break;
  }
};

// common function to check whether measurement is going on or not
const getDeviceMeasureStatus = (device) => {
  switch (device) {
    case 'I1PRO3':
    case 'I1PRO3_STRIPMODE':
      return getI1PRO3MeasureStatus();

    case 'I1PRO2':
      return getI1PROMeasureStatus();

    case 'CI62':
      return getCI62MeasureStatus();

    case 'CI64':
      return getCI64MeasureStatus();

    case 'CI64UV':
      return getCI64UVMeasureStatus();

    case 'COLORSCOUT':
      return getColorScoutMeasureStatus();

    case 'EXACT':
      return getExactMeasureStatus();

    case 'EXACT2':
    case 'EXACT2_STRIPMODE':
      return getExact2MeasureStatus();

    case 'I1IO3':
      return getI1IO3StartMeasure();

    default:
      return false;
  }
};

// set device disconnect timeout if disconnect on 2h inactivity flag is selected
const setDeviceDisconnectTimeout = (deviceType) => {
  if (!deviceType) return;
  deviceDisconnectionTimeout = setTimeout(
    () => {
      mainWindow.webContents.send(DEVICE_DISCONNECT_TIMEOUT, {
        hasTimeout: true,
        deviceType,
      });
    },
    1000 * 60 * 60 * 2,
  ); // set 2 hours of inactivity timeout
};

const clearDeviceDisconnectTimeout = () => {
  clearTimeout(deviceDisconnectionTimeout);
};

const setUpperThresholdValue = async (upperThresholdValue) => {
  try {
    const upperThresholdResult = await setUpperThreshold(upperThresholdValue);
    updateCurrentAction(`Set Upper Threshold value: ${upperThresholdValue}`);

    return upperThresholdResult;
  } catch (error) {
    updateCurrentAction(`Set Upper Threshold failed: ${error.message}`);
    throw error;
  }
};

const setLowerThresholdValue = async (lowerThresholdValue) => {
  try {
    const lowerThresholdResult = await setLowerThreshold(lowerThresholdValue);
    updateCurrentAction(`Set Lower Threshold value: ${lowerThresholdValue}`);

    return lowerThresholdResult;
  } catch (error) {
    updateCurrentAction(`Set Lower Threshold failed: ${error.message}`);
    throw error;
  }
};

const weightPrecisionBalance = async (args) => {
  try {
    updateCurrentAction('Taking weight...');
    const measRes = await getStableResultCurrentUnit();
    if (measRes.res) {
      args.pb_weight_data.is_weight = measRes.res;
      args.pb_weight_data.weightData = measRes.data;
      updateCurrentAction('Weighting complete');
    } else {
      args.error = { message: measRes.errorMessage };
      updateCurrentAction('Weighting failed');
    }

    const indexOfMinusSign = measRes.data.indexOf('-');
    if (indexOfMinusSign === -1) {
      if (!args.pb_threshold_data.is_last) {
        const upperThresholdResult = await setUpperThresholdValue(
          args.pb_threshold_data.upper_threshold_value,
        );
        if (!upperThresholdResult.res) {
          args.error = { message: upperThresholdResult.errorMessage };
          updateCurrentAction(
            `Set Upper Threshold failed: ${upperThresholdResult.errorMessage}`,
          );
        } else {
          args.pb_threshold_data.upper_threshold_value =
            upperThresholdResult.data;
        }

        const lowerThresholdResult = await setLowerThresholdValue(
          args.pb_threshold_data.lower_threshold_value,
        );
        if (!lowerThresholdResult.res) {
          args.error = { message: lowerThresholdResult.errorMessage };
          updateCurrentAction(
            `Set Lower Threshold failed: ${lowerThresholdResult.errorMessage}`,
          );
        } else {
          args.pb_threshold_data.is_set_threshold = lowerThresholdResult.res;
          args.pb_threshold_data.lower_threshold_value =
            lowerThresholdResult.data;
        }
      }
    }

    webSocketWorkerWindow.webContents.send(WEIGHT_MEASUREMENT, args);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

/* Reset Data Function START */
const resetPrecisionBalanceDevice = async (args) => {
  try {
    updateCurrentAction('Resetting Precision Balance Device...');

    const stableResult = await getStableResultCurrentUnit();

    const isTerminate = await checkAndHandleMinusSign(args, stableResult);
    if (isTerminate) return;

    if (shouldContinueReset(args)) {
      markAsReset(args);
    } else {
      const resetDeviceData = await setZero();

      if (resetDeviceData.res) {
        await handleResetSuccess(args);

        updateCurrentAction('Finding the current working mode...');

        const currentWorkingMode = await findCurrentWorkingMode();

        if (!isCheckweighingMode(currentWorkingMode)) {
          await setWorkingModeCheckweighing(args);
        } else {
          args.pb_reset_data.is_setWorkingMode = true;
        }
        await setThresholdValues(args);
      } else {
        await handleResetFailure(args, resetDeviceData);
      }
    }

    await sendResultsOverWebSocket(args);
  } catch (error) {
    handleErrors(args, error);
  }
};

// Helper Functions

const isCheckweighingMode = (mode) =>
  mode && mode.data === '12 "Checkweighing" OK';

const setWorkingModeCheckweighing = async (args) => {
  const setWorkingModeResult = await setWorkingMode();
  await updateWorkingModeResult(args, setWorkingModeResult);
};

const updateWorkingModeResult = async (args, result) => {
  if (!result.res) {
    args.error = { message: result.errorMessage };
    await updateCurrentAction(
      `Set working mode failed: ${result.errorMessage}`,
    );
  } else {
    args.pb_reset_data.is_setWorkingMode = result.res;
  }
};

const setThresholdValues = async (args) => {
  await setThresholdValue(
    args,
    args.pb_threshold_data.upper_threshold_value,
    'Upper',
    'Set Upper Threshold failed',
  );
  await setThresholdValue(
    args,
    args.pb_threshold_data.lower_threshold_value,
    'Lower',
    'Set Lower Threshold failed',
  );
};

const setThresholdValue = async (
  args,
  thresholdValue,
  thresholdType,
  errorMessage,
) => {
  if (thresholdValue) {
    const thresholdResult = await setThreshold(thresholdValue, thresholdType);

    if (!thresholdResult.res) {
      args.error = { message: thresholdResult.errorMessage };
      updateCurrentAction(
        `${thresholdType} Threshold failed: ${thresholdResult.errorMessage}`,
      );
    } else {
      args.pb_threshold_data.is_set_threshold = thresholdResult.res;
      args.pb_threshold_data[`${thresholdType.toLowerCase()}_threshold_value`] =
        thresholdResult.data;
    }
  }
};

const setThreshold = async (value, type) => {
  return type === 'Upper'
    ? setUpperThresholdValue(value)
    : setLowerThresholdValue(value);
};

const markAsReset = (args) => {
  args.pb_reset_data.is_reset = true;
  args.pb_reset_data.resetData = true;
};

const shouldContinueReset = (args) => args.pb_reset_data.is_continue;

const handleResetSuccess = (args) => {
  markAsReset(args);
  updateCurrentAction('Resetting complete');
};

const handleResetFailure = (args, resetDeviceData) => {
  args.error = { message: resetDeviceData.errorMessage };
  updateCurrentAction(
    `Resetting device failed: ${resetDeviceData.errorMessage}`,
  );
};

const checkAndHandleMinusSign = async (args, stableResult) => {
  if (hasTwoValues(stableResult)) {
    const firstValue = await extractFirstNumberFromArray(stableResult.data);

    if (firstValue > 0) {
      const errorMessage = args.pb_reset_data.is_negative
        ? 'Zeroin Process out of range. Press taring button or restart balance'
        : 'Please Empty the scale first then try again!!';

      args.error = { message: errorMessage };
      handleMinusSign(args);
      return true;
    }
  }
  return false;
};

const handleMinusSign = (args) => {
  sendResultsOverWebSocket(args);
  updateCurrentAction(args.error.message);
};

const hasTwoValues = (result) =>
  result && result.data && result.data.length === 2;

const sendResultsOverWebSocket = (args) => {
  webSocketWorkerWindow.webContents.send(MAKE_RESET_DEVICE, args);
};

const handleErrors = (args, error) => {
  sendResultsOverWebSocket(args);
  console.error('An error occurred:', error);
};

/* Reset Data Function END */

/* GET tare Function this function is work when button was press */

const handleGetTareValueInDevice = async (args) => {
  try {
    updateCurrentAction('Setting Tare Value...');
    const stableMeasurementResult = await getStableResultCurrentUnit();

    if (stableMeasurementResult.res) {
      if (stableMeasurementResult.data.length > 0) {
        updateCurrentAction('Get Tare Value complete');
        const indexOfMinusSign = stableMeasurementResult.data.indexOf('-');

        if (indexOfMinusSign !== -1) {
          if (args.pb_tare_data.is_negative) {
            handleMinusSignError(
              args,
              'Taring out of range press zerion button or restart balance',
            );
          } else {
            handleMinusSignError(
              args,
              'Negative values are not allowed in the Tare Value field.',
            );
          }
          return;
        }

        const questionMarkIndex = stableMeasurementResult.data.indexOf('?');

        if (questionMarkIndex !== -1) {
          args.error = {
            message:
              'Please wait until the value becomes stable then set tare in the device.',
          };
          sendWebSocketMessage(GET_TARE_VALUE, args);
          updateCurrentAction(
            'Please wait until the value becomes stable then set tare in the device.',
          );
          return;
        }

        const measurementData = await extractFirstNumberFromArray(
          stableMeasurementResult.data,
        );

        if (measurementData !== null) {
          const setTareValueResult = await setTareValue(measurementData);

          if (setTareValueResult.res) {
            updateCurrentAction(
              `Setting Tare Value complete ${measurementData}`,
            );
            args.pb_tare_data.is_tare = setTareValueResult.res;
            args.pb_tare_data.tare_value = measurementData;
            updateCurrentAction('Set Tare Value complete');
          } else {
            args.error = { message: setTareValueResult.errorMessage };
            updateCurrentAction('Set Tare Value failed');
          }
        } else if (measurementData === 0) {
          args.pb_tare_data.is_tare = true;
          args.pb_tare_data.tare_value = measurementData;
          updateCurrentAction('Set Tare Value complete');
        }
      }
    } else {
      args.error = { message: stableMeasurementResult.errorMessage };
      updateCurrentAction('Get Tare Value failed');
    }

    sendWebSocketMessage(GET_TARE_VALUE, args);
  } catch (error) {
    sendWebSocketMessage(GET_TARE_VALUE, args);
  }
};
const handleMinusSignError = (args, errorMessage) => {
  args.error = { message: errorMessage };
  sendWebSocketMessage(GET_TARE_VALUE, args);
  updateCurrentAction(errorMessage);
};

const sendWebSocketMessage = (event, args) => {
  webSocketWorkerWindow.webContents.send(event, args);
};

/* GET tare Function END */

const handleSetTareValueInDevice = async (args) => {
  try {
    if (args.pb_tare_data.tare_value_colorportal) {
      const tareValue = parseFloat(args.pb_tare_data.tare_value_colorportal);

      if (!isNaN(tareValue)) {
        const setTareValueResult = await setTareValue(tareValue);

        if (setTareValueResult.res) {
          args.pb_tare_data.is_set_tare = setTareValueResult.res;
          args.pb_tare_data.tare_value_colorportal = tareValue;
          updateCurrentAction('Set Tare Value complete');
        } else {
          args.error = { message: setTareValueResult.errorMessage };
          updateCurrentAction('Set Tare Value failed');
        }
      } else {
        args.error = { message: 'The value must be provided in number format' };
        updateCurrentAction('The value must be provided in number format');
      }
    } else {
      args.error = { message: 'A value must be provided to set tare' };
      updateCurrentAction('A value must be provided to set tare');
    }
    console.log('🚀 ~ file: main.js:3000 ~ handle Set Tare value :', args);
    webSocketWorkerWindow.webContents.send(SET_TARE_VALUE, args);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

// on get device list and licenses api call
ipcMain.on(GET_DEVICE_AND_LICENSES, async (event, args) => {
  const { instanceURL, username, token } = args;
  const deviceRes = await getDeviceListAPICall(instanceURL, username, token);
  const licenseRes = await getLicensesAPICall(instanceURL, token);
  event.reply(GET_DEVICE_AND_LICENSES, {
    deviceRes,
    licenseRes,
  });
});

// on get token api call
ipcMain.on(GET_TOKEN, async (event, args) => {
  console.log('args', args);
  const res = await getToken(args);
  event.reply(GET_TOKEN, res);
});

// ipcMain.on(ACQUIRE_LICENSE, async (_, args) => {
//   const res = await acquireLicense();
//   mainWindow.webContents.send(ACQUIRE_LICENSE, res);
// });

// ipcMain.on(RELEASE_LICENSE, async (_, args) => {
//   const res = await releaseLicense();
//   mainWindow.webContents.send(RELEASE_LICENSE, res);
// });

// on get device instance url call
// TODO : currently used static url, change to dynamic url from api response
ipcMain.on(GET_DEVICE_INSTANCE_URL, async (_, args) => {
  const res = await getDeviceInstanceLink(args);
  mainWindow.webContents.send(GET_DEVICE_INSTANCE_URL, res);
});

// on login/new connection api call
ipcMain.on(LOGIN, async (event, args) => {
  const { instanceURL, username, password, token } = args;
  const res = await login(instanceURL, username, password, token);
  event.reply(LOGIN, { ...res, ...args });
});

ipcMain.on('log', (_, args) => {});

// auto-update ipc calls
// on check for update
ipcMain.on(CHECK_FOR_UPDATE, (_, args) => {
  log.log('checking for updates...');
  autoUpdater.checkForUpdates();
});

// on download updates
ipcMain.on(DOWNLOAD_UPDATE, (_, args) => {
  log.log('triggering download update');
  autoUpdater.downloadUpdate();
});

// on quit and install
ipcMain.on(QUIT_AND_INSTALL, (_, args) => {
  log.log('quiting app and install new version');
  autoUpdater.quitAndInstall();
});

autoUpdater.on('update-available', async (updateInfo) => {
  log.log('update available');
  updateInfo.releaseNotes = await getAllReleaseNotesAfterCurrentVersion(
    app.getVersion(),
  );
  mainWindow?.webContents.send(CHECK_FOR_UPDATE, {
    updateAvailable: true,
    updateInfo,
  });
});

autoUpdater.on('update-not-available', (updateInfo) => {
  log.log('update-not-available =======');
  mainWindow?.webContents.send(CHECK_FOR_UPDATE, { updateAvailable: false });
});

autoUpdater.on('update-downloaded', (updateInfo) => {
  log.log('update-downloaded =======');
  mainWindow?.webContents.send(DOWNLOAD_UPDATE, null);
});

autoUpdater.on('before-quit-for-update', () => {});

autoUpdater.on('error', (args) => {
  log.log('error in updating app =======');
  log.log(args);
  mainWindow?.webContents.send(UPDATE_ERROR, args);
});

autoUpdater.on('download-progress', (progressObj) => {
  log.log(progressObj.percent);
  log.log(Math.round(progressObj.percent));
  mainWindow.webContents.send(
    DOWNLOAD_PROGRESS,
    Math.round(progressObj.percent),
  );
});

// function to get latest release notes using octokit api call
const getAllReleaseNotesAfterCurrentVersion = async (currentVersion) => {
  try {
    log.log('getting release notes ==');
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/releases',
      {
        owner: 'CMAIDT',
        repo: 'ColorPortal',
      },
    );
    const releases = response.data;
    const allReleaseNotes = [];
    if (releases.length > 0) {
      releases.forEach((release) => {
        if (
          semver.valid(release.name) &&
          semver.gt(release.name, currentVersion)
        )
          if (typeof release.body === 'string') {
            const notes = release.body.split('\n').map((note) => {
              if (note.startsWith('-')) {
                return note.slice(1).trim();
              }
              return note.trim();
            });
            allReleaseNotes.push({ version: release.name, notes });
          }
      });
    }

    return allReleaseNotes;
  } catch (error) {
    log.log('error getting release notes ===');
    log.log(error);
    return null;
  }
};

// colorgate

ipcMain.on(CHECK_THIRD_PARTY_API_CONNECTION, async (_, args) => {
  const timeOnReq = Date.now();
  const { url, method, params } = args.colorGateAPI.request;
  let log = getLogInfo(
    timeOnReq,
    null,
    null,
    method,
    url,
    params,
    null,
    'Requested',
  );
  if (args.shouldLogged)
    mainWindow?.webContents.send(COLOR_GATE_API_LOG, { ...args, log });
  const res = await colorGateAPI(args);
  if (args.colorGateAPI?.response?.data) {
    colorGateBaseURL = args.colorGateAPI?.request?.baseURL;
    colorGateAuth = args.colorGateAPI?.request?.headers?.Authorization;
    colorGateFilePath = args.filePath;
  }
  const timeOnRes = Date.now();
  const resDuration = (timeOnRes - timeOnReq) / 1000;
  log = getLogInfo(
    timeOnRes,
    resDuration,
    null,
    method,
    url,
    params,
    res.status,
    res.statusText,
  );
  if (args.shouldLogged)
    mainWindow?.webContents.send(COLOR_GATE_API_LOG, { ...args, log });
  mainWindow?.webContents.send(CHECK_THIRD_PARTY_API_CONNECTION, res);
});

ipcMain.on(CHECK_COLOR_GATE_API_CONNECTION, async (_, args) => {
  const res = await colorGateAPI(args);
  if (args.colorGateAPI?.response?.data) {
    colorGateBaseURL = args.colorGateAPI?.request?.baseURL;
    colorGateAuth = args.colorGateAPI?.request?.headers?.Authorization;
  }
  mainWindow?.webContents.send(CHECK_COLOR_GATE_API_CONNECTION, res);
});

ipcMain.on(COLOR_GATE_API_REQ, async (_, args) => {
  if (
    (args.colorGateAPI?.type && args.colorGateAPI.type === 'file_replace') ||
    (args.colorGateAPI?.type && args.colorGateAPI.type === 'get_file_data')
  ) {
    args.colorGateAPI.request.fileName = colorGateFilePath;
    const res = await colorGateAPI(args);
    webSocketWorkerWindow?.webContents.send(COLOR_GATE_API_RES, res);
    return;
  }

  const timeOnReq = Date.now();
  const { url, method, params } = args.colorGateAPI.request;
  let log = getLogInfo(
    timeOnReq,
    null,
    null,
    method,
    url,
    params,
    null,
    'Requested',
  );
  mainWindow?.webContents.send(COLOR_GATE_API_LOG, { log });
  args.colorGateAPI.request = {
    ...args.colorGateAPI.request,
    baseURL: colorGateBaseURL,
  };
  if (args?.colorGateAPI?.request?.headers) {
    args.colorGateAPI.request.headers = {
      ...args.colorGateAPI.request.headers,
      Authorization: colorGateAuth,
    };
  } else {
    args.colorGateAPI.request = {
      ...args.colorGateAPI.request,
      headers: { Authorization: colorGateAuth },
    };
  }
  const res = await colorGateAPI(args);
  const timeOnRes = Date.now();
  const resDuration = (timeOnRes - timeOnReq) / 1000;
  log = getLogInfo(
    timeOnRes,
    resDuration,
    null,
    method,
    url,
    params,
    res.status,
    res.statusText,
  );
  mainWindow?.webContents.send(COLOR_GATE_API_LOG, { log });
  webSocketWorkerWindow?.webContents.send(COLOR_GATE_API_RES, res);
});

ipcMain.on(COLOR_GATE_SERVER_CONNECTION_REQ, (_, args) => {
  webSocketWorkerWindow?.webContents.send(
    COLOR_GATE_SERVER_CONNECTION_REQ,
    args,
  );
});

ipcMain.on(COLOR_GATE_SERVER_CONNECTION_RES, (_, args) => {
  mainWindow?.webContents.send(COLOR_GATE_SERVER_CONNECTION_RES, args);
});

ipcMain.on(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, async (_, args) => {
  const { instanceURL, status, licence, licenceUpdate } = args;
  await updateColorGateUserStatusAPICall(
    instanceURL,
    status,
    licence,
    licenceUpdate,
  );
});

ipcMain.on(COLOR_GATE_CONNECTION_CHECK, (_, args) => {
  mainWindow?.webContents.send(COLOR_GATE_CONNECTION_CHECK_REQ, args);
});

ipcMain.on(COLOR_GATE_CONNECTION_CHECK_RES, (_, args) => {
  webSocketWorkerWindow?.webContents.send(COLOR_GATE_CONNECTION_CHECK, args);
});

ipcMain.on(COLOR_GATE_UPDATE_LICENSE, (_, args) => {
  webSocketWorkerWindow?.webContents.send(COLOR_GATE_UPDATE_LICENSE, args);
});

ipcMain.on(GET_IP, (event, arg) => {
  const ipv4 = getLocalIp();
  event.returnValue = ipv4;
});

ipcMain.on(GET_APP_VERSION, (event, arg) => {
  const currentVersion = app.getVersion();
  event.returnValue = currentVersion;
});

// alwan functions

ipcMain.on(TEST_ALWAN_API_CONNECTION, async (_, args) => {
  const timeOnReq = Date.now();
  const { url, method, params } = args.alwanAPI.request;
  let log = getLogInfo(
    timeOnReq,
    null,
    null,
    method,
    url,
    params,
    null,
    'Requested',
  );
  if (args.shouldLogged)
    mainWindow?.webContents.send(ALWAN_API_LOG, { ...args, log });
  const res = await alwanAPI(args);
  if (args.alwanAPI?.response?.data) {
    alwanBaseURL = args.alwanAPI?.request?.baseURL;
    alwanAuth = args.alwanAPI?.request?.headers?.Authorization;
  }
  const timeOnRes = Date.now();
  const resDuration = (timeOnRes - timeOnReq) / 1000;
  log = getLogInfo(
    timeOnRes,
    resDuration,
    null,
    method,
    url,
    params,
    res.status,
    res.statusText,
  );
  if (args.shouldLogged)
    mainWindow?.webContents.send(ALWAN_API_LOG, { ...args, log });
  mainWindow?.webContents.send(TEST_ALWAN_API_CONNECTION, res);
});

ipcMain.on(CHECK_ALWAN_API_CONNECTION, async (_, args) => {
  const timeOnReq = Date.now();
  const { url, method, params } = args.alwanAPI.request;
  const res = await alwanAPI(args);
  if (args.alwanAPI?.response?.data) {
    alwanBaseURL = args.alwanAPI?.request?.baseURL;
    alwanAuth = args.alwanAPI?.request?.headers?.Authorization;
  }
  mainWindow?.webContents.send(CHECK_ALWAN_API_CONNECTION, res);
});

ipcMain.on(ALWAN_API_REQ, async (_, args) => {
  const timeOnReq = Date.now();
  const { url, method, params } = args.alwanAPI.request;
  let log = getLogInfo(
    timeOnReq,
    null,
    null,
    method,
    url,
    params,
    null,
    'Requested',
  );
  mainWindow?.webContents.send(ALWAN_API_LOG, { log });
  args.alwanAPI.request = {
    ...args.alwanAPI.request,
    baseURL: alwanBaseURL,
  };
  if (args?.alwanAPI?.request?.headers) {
    args.alwanAPI.request.headers = {
      ...args.alwanAPI.request.headers,
      Authorization: alwanAuth,
    };
  } else {
    args.alwanAPI.request = {
      ...args.alwanAPI.request,
      headers: { Authorization: alwanAuth },
    };
  }
  const res = await alwanAPI(args);
  const timeOnRes = Date.now();
  const resDuration = (timeOnRes - timeOnReq) / 1000;
  log = getLogInfo(
    timeOnRes,
    resDuration,
    null,
    method,
    url,
    params,
    res.status,
    res.statusText,
  );
  mainWindow?.webContents.send(ALWAN_API_LOG, { log });
  webSocketWorkerWindow?.webContents.send(ALWAN_API_RES, res);
});

ipcMain.on(ALWAN_SERVER_CONNECTION_REQ, (_, args) => {
  webSocketWorkerWindow?.webContents.send(ALWAN_SERVER_CONNECTION_REQ, args);
});

ipcMain.on(ALWAN_SERVER_CONNECTION_RES, (_, args) => {
  mainWindow?.webContents.send(ALWAN_SERVER_CONNECTION_RES, args);
});

ipcMain.on(CMA_API_FOR_ALWAN_STATUS_UPDATE, async (_, args) => {
  const { instanceURL, status, licence, licenceUpdate } = args;
  await updateAlwanUserStatusAPICall(
    instanceURL,
    status,
    licence,
    licenceUpdate,
  );
});

ipcMain.on(ALWAN_CONNECTION_CHECK, (_, args) => {
  mainWindow?.webContents.send(ALWAN_CONNECTION_CHECK_REQ, args);
});

ipcMain.on(ALWAN_CONNECTION_CHECK_RES, (_, args) => {
  webSocketWorkerWindow?.webContents.send(ALWAN_CONNECTION_CHECK, args);
});

ipcMain.on(ALWAN_UPDATE_LICENSE, (_, args) => {
  webSocketWorkerWindow?.webContents.send(ALWAN_UPDATE_LICENSE, args);
});

// scan i1io3 chart channels
ipcMain.on(EXPORT_LAST_SCAN_DATA, (_, args) => {
  const filePath = path.join(
    __dirname,
    'devices',
    'i1iO3',
    'chart_auto_LAB_M0.txt',
  );

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      mainWindow?.webContents.send(EXPORT_LAST_SCAN_DATA, {
        res: false,
        fileData: null,
      });
      return;
    }
    mainWindow?.webContents.send(EXPORT_LAST_SCAN_DATA, {
      res: true,
      fileData: data,
    });
  });
});

// helper function
const getLogInfo = (
  timeStamp,
  duration,
  client,
  method,
  url,
  parameters,
  status,
  result,
) => ({
  timeStamp,
  date: new Date().toISOString().split('T')[0],
  time: new Date().toLocaleTimeString(),
  duration: duration ?? '-',
  client: client ?? '-',
  method: method ?? '-',
  url: url ?? '-',
  parameters: parameters
    ? typeof parameters === 'object'
      ? JSON.stringify(parameters)
      : parameters
    : '-',
  status: status ?? '-',
  result: result ?? '-',
});
