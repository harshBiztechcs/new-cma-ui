import React, { useEffect, useState } from 'react';
import './App.css';
import './assets/scss/main.css';
import Login from './views/Login';
import NewConnection from './views/NewConnection';
import ServerConnection from './views/serverConnection';
import DeviceSelection from './views/DeviceSelection';
import DeviceMeasurement from './views/DeviceMeasurement';
import AppUpdate from './views/AppUpdate';
import {
  DISCONNECT_SOCKET,
  DISCONNECT_DEVICE,
  CONNECT_SOCKET,
  SOCKET_CONNECTION,
  NETWORK_CONNECTION,
  CLIENT_SOCKET_ALREADY_EXIST,
  SHOW_DIALOG,
  DEVICE_STATUS_UPDATE_CALL,
  DEVICE_DISCONNECT_API_CALL,
  DEVICE_DISCONNECT_TIMEOUT,
  DISCONNECT_DEVICE_FROM_SERVER,
  CHECK_FOR_UPDATE,
  DOWNLOAD_UPDATE,
  QUIT_AND_INSTALL,
  UPDATE_ERROR,
  DOWNLOAD_PROGRESS,
  COLOR_GATE_API_LOG,
  COLOR_GATE_CONNECTION_CHECK_REQ,
  COLOR_GATE_CONNECTION_CHECK_RES,
  CHECK_COLOR_GATE_API_CONNECTION,
  CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
  COLOR_GATE_SERVER_CONNECTION_REQ,
  COLOR_GATE_SERVER_CONNECTION_RES,
  ALWAN_API_LOG,
  ALWAN_CONNECTION_CHECK_REQ,
  ALWAN_CONNECTION_CHECK_RES,
  CHECK_ALWAN_API_CONNECTION,
  CMA_API_FOR_ALWAN_STATUS_UPDATE,
  ALWAN_SERVER_CONNECTION_REQ,
  ALWAN_SERVER_CONNECTION_RES,
  CURRENT_ACTION,
  VERIFY_DEVICE_CONNECTION,
  APP_CLOSE_CONFIRMED,
  APP_REQUEST_CLOSE,
  SWITCH_TO_YS3060_CONNECTION_MODE,
  CURRENT_TAB_UPDATE,
  DISCONNECT_SOCKET_INSTANCE_1,
  DISCONNECT_SOCKET_INSTANCE_2,
} from 'utility/constants';
import InternetConnectionLost from './views/InternetConnectionLost';
import PopupModal from './components/PopupModal';
import ColorMatch from './views/ColorMatch';
import DevicePrecision from './views/DevicePrecision';
import DeviceBarcode from './views/DeviceBarcode';
import DeviceZebraPrinter from './views/DeviceZebraPrinter';
import { InstanceConnectionProvider } from './context/InstanceConnectionProvider';
const { ipcRenderer } = window.require('electron');
let colorGateConnectionInterval = null;
let colorGateReConnectionTimeout = null;

// alwan
let alwanConnectionInterval = null;
let alwanReConnectionTimeout = null;

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isNewConnection, setIsNewConnection] = useState(true);
  const [username, setUsername] = useState(null);
  const [token, setToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [instanceURL, setInstanceURL] = useState(null);
  const [socketURL, setSocketURL] = useState(null);
  const [lastConnectedDevice, setLastConnectedDevice] = useState(null);
  const [licenses, setLicenses] = useState(null);
  const [isServerWaiting, setIsServerWaiting] = useState(false);
  const [connectedDeviceList, setConnectedDeviceList] = useState([]);
  const [deviceList, setDeviceList] = useState([]);
  const [lastDevice, setLastDevice] = useState(null);
  const [rememberUser, setRememberUser] = useState(false);
  const [deviceChangeFrom, setDeviceChangeFrom] = useState(null);
  const [hasInternet, setHasInternet] = useState(true);
  const [networkConnection, setNetworkConnection] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [socketConnection, setSocketConnection] = useState(false);
  const [hasDeviceDisconnectTimeout, setHasDeviceDisconnectTimeout] =
    useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');
  const [waitForReconnection, setWaitForReconnection] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showCheckUpdatePage, setShowCheckUpdatePage] = useState(false);

  //auto-update
  const [isNewUpdateAvailable, setIsNewUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateError, setUpdateError] = useState(serverError);
  const [checkUpdate, setCheckUpdate] = useState(true);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStarted, setDownloadStarted] = useState(false);

  //third-party api
  const [showThirdPartyAPIPage, setShowThirdPartyAPIPage] = useState(false);
  const [thirdPartyAPIUser, setThirdPartyAPIUser] = useState(false);

  // colorgate
  const [colorGateAPILog, setColorGateAPILog] = useState([]);
  const [colorGateConnection, setColorGateConnection] = useState(false);
  const [colorGateSocketConnection, setColorGateSocketConnection] =
    useState(false);
  const [colorGatePopupError, setColorGatePopupError] = useState('');
  const [colorGatePopupTitle, setColorGatePopupTitle] = useState('Error');
  const [socketConnectionInProgress, setSocketConnectionInProgress] =
    useState(false);

  // alwan api
  const [alwanAPILog, setAlwanAPILog] = useState([]);
  const [alwanConnection, setAlwanConnection] = useState(false);
  const [alwanSocketConnection, setAlwanSocketConnection] = useState(false);
  const [alwanPopupError, setAlwanPopupError] = useState('');
  const [alwanPopupTitle, setAlwanPopupTitle] = useState('Error');
  const [alwanSocketConnectionInProgress, setAlwanSocketConnectionInProgress] =
    useState(false);

  // I1IO3 scanning
  const [scanRes, setScanRes] = useState(null);
  const [currentI1IO3Action, setCurrentI1IO3Action] = useState('');

  // Precision Balance
  const [isPrecisionShow, setisPrecisionShow] = useState(false);
  const [balanceDeviceList, setBalanceDeviceList] = useState([]);
  const [lastPBDevice, setLastPBDevice] = useState(null);
  const [lastConnectedPBDevice, setLastConnectedPBDevice] = useState(null);
  const [connectedPBDeviceList, setConnectedPBDeviceList] = useState([]);

  //Barcode Device

  const [isBarcodeOnShow, setIsBarcodeOnShow] = useState(false);
  const [barcodeDeviceList, setBarcodeDeviceList] = useState([]);
  const [lastBarcodeDevice, setLastBarcodeDevice] = useState(null);
  const [lastConnectedBarcode, setLastConnectedBarcode] = useState(null);
  const [connectedBarcodeList, setConnectedBarcodeList] = useState([]);

  // Zerba Printer Device

  const [isZebraOnShow, setIsZebraOnShow] = useState(false);
  const [zebraDeviceList, setZebraDeviceList] = useState([]);
  const [lastZebraDevice, setLastZebraDevice] = useState(null);
  const [lastConnectedZebra, setLastConnectedZebra] = useState(null);
  const [connectedZebraList, setConnectedZebraList] = useState([]);

  useEffect(() => {
    ipcRenderer.on(NETWORK_CONNECTION, checkOnlineStatus);
    ipcRenderer.on(SOCKET_CONNECTION, onSocketConnection);
    ipcRenderer.on(CLIENT_SOCKET_ALREADY_EXIST, onClientSocketAlreadyExist);
    ipcRenderer.on(SHOW_DIALOG, onShowDialog);
    ipcRenderer.on(DEVICE_DISCONNECT_API_CALL, afterDeviceDisconnectionCall);
    ipcRenderer.on(VERIFY_DEVICE_CONNECTION, onVerifyDeviceConnection);

    //auto-update
    ipcRenderer.on(CHECK_FOR_UPDATE, onCheckForUpdate);
    ipcRenderer.on(DOWNLOAD_UPDATE, onDownloadUpdate);
    ipcRenderer.on(UPDATE_ERROR, onUpdateError);
    ipcRenderer.on(DOWNLOAD_PROGRESS, onDownloadProgress);

    //colorGate log
    ipcRenderer.on(COLOR_GATE_API_LOG, onColorGateAPILog);
    ipcRenderer.on(
      COLOR_GATE_CONNECTION_CHECK_REQ,
      onColorGateConnectionCheckReq
    );

    //alwan log
    ipcRenderer.on(ALWAN_API_LOG, onAlwanAPILog);
    ipcRenderer.on(ALWAN_CONNECTION_CHECK_REQ, onAlwanConnectionCheckReq);

    //colorGate Connection
    ipcRenderer.on(
      CHECK_COLOR_GATE_API_CONNECTION,
      onColorGateAPIConnectionResponse
    );
    ipcRenderer.on(
      COLOR_GATE_SERVER_CONNECTION_RES,
      onColorGateServerConnectionRes
    );

    // alwan connection
    ipcRenderer.on(CHECK_ALWAN_API_CONNECTION, onAlwanAPIConnectionResponse);
    ipcRenderer.on(ALWAN_SERVER_CONNECTION_RES, onAlwanServerConnectionRes);

    // I1IO3 scanning
    ipcRenderer.on(CURRENT_ACTION, onCurrentAction);

    //check if any update
    handleCheckUpdate();

    // ipcRenderer.on(SOCKET_DISCONNECT_CLEANLY, onSocketDisconnect);
    // window.addEventListener('online', () => {
    //   setNetworkConnection(true);
    // });
    // window.addEventListener('offline', () => {
    //   setHasInternet(false);
    //   setNetworkConnection(false);
    // });

    return () => {
      setSocketConnection(false);

      // colorgate
      clearInterval(colorGateConnectionInterval);
      colorGateConnectionInterval = null;
      clearTimeout(colorGateReConnectionTimeout);
      colorGateReConnectionTimeout = null;
      setColorGateSocketConnection(false);
      setSocketConnectionInProgress(false);
      setColorGateConnection(false);

      //alwan
      clearInterval(alwanConnectionInterval);
      alwanConnectionInterval = null;
      clearTimeout(alwanReConnectionTimeout);
      alwanReConnectionTimeout = null;
      setAlwanSocketConnection(false);
      setAlwanSocketConnectionInProgress(false);
      setAlwanConnection(false);

      ipcRenderer.removeListener(SHOW_DIALOG, onShowDialog);
      ipcRenderer.removeListener(SOCKET_CONNECTION, onSocketConnection);
      ipcRenderer.removeListener(NETWORK_CONNECTION, checkOnlineStatus);
      ipcRenderer.removeListener(
        CLIENT_SOCKET_ALREADY_EXIST,
        onClientSocketAlreadyExist
      );
      ipcRenderer.removeListener(
        DEVICE_DISCONNECT_API_CALL,
        afterDeviceDisconnectionCall
      );

      //auto-update
      ipcRenderer.removeListener(CHECK_FOR_UPDATE, onCheckForUpdate);
      ipcRenderer.removeListener(DOWNLOAD_UPDATE, onDownloadUpdate);
      ipcRenderer.removeListener(UPDATE_ERROR, onUpdateError);
      ipcRenderer.removeListener(DOWNLOAD_PROGRESS, onDownloadProgress);
      ipcRenderer.removeListener(
        VERIFY_DEVICE_CONNECTION,
        onVerifyDeviceConnection
      );
      //colorGate
      ipcRenderer.removeListener(COLOR_GATE_API_LOG, onColorGateAPILog);
      ipcRenderer.removeListener(
        COLOR_GATE_CONNECTION_CHECK_REQ,
        onColorGateConnectionCheckReq
      );
      ipcRenderer.removeListener(
        CHECK_COLOR_GATE_API_CONNECTION,
        onColorGateAPIConnectionResponse
      );
      ipcRenderer.removeListener(
        COLOR_GATE_SERVER_CONNECTION_RES,
        onColorGateServerConnectionRes
      );

      // alwan
      ipcRenderer.removeListener(ALWAN_API_LOG, onAlwanAPILog);
      ipcRenderer.removeListener(
        ALWAN_CONNECTION_CHECK_REQ,
        onAlwanConnectionCheckReq
      );
      ipcRenderer.removeListener(
        CHECK_ALWAN_API_CONNECTION,
        onAlwanAPIConnectionResponse
      );
      ipcRenderer.removeListener(
        ALWAN_SERVER_CONNECTION_RES,
        onAlwanServerConnectionRes
      );

      // I1IO3 scanning
      ipcRenderer.removeListener(CURRENT_ACTION, onCurrentAction);
      localStorage.setItem('socketConnectionInterval', 0);
    };
  }, []);

  useEffect(() => {
    console.log({ socketConnection, hasInternet, isServerWaiting });
    let socketConnectionInterval;
    if (
      !socketConnection &&
      hasInternet &&
      isServerWaiting &&
      serverError !==
        'CMA Connect User ID is currently open in another session. Please try again after logging out from the other session.'
    ) {
      console.log(localStorage.getItem('socketConnectionInterval'));
      clearInterval(localStorage.getItem('socketConnectionInterval'));
      socketConnectionInterval = setInterval(() => {
        console.log('Socket connection interval');
        ipcRenderer.send(CONNECT_SOCKET, {
          username,
          instanceURL,
          token,
          socketURL,
        });
      }, 1000 * 5);
      localStorage.setItem(
        'socketConnectionInterval',
        socketConnectionInterval
      );
    } else {
      console.log(localStorage.getItem('socketConnectionInterval'));
      clearInterval(localStorage.getItem('socketConnectionInterval'));
    }
  }, [socketConnection, hasInternet, isServerWaiting]);

  useEffect(() => {
    if (networkConnection && !isLoggedIn) {
      setHasInternet(true);
    }
    if (!networkConnection && isLoggedIn) {
      setWaitForReconnection(true);
      setTimeout(() => {
        setWaitForReconnection(false);
      }, 29000);
    }
  }, [networkConnection, isLoggedIn]);

  useEffect(() => {
    if (hasInternet && !socketConnection && isLoggedIn) {
      if (lastConnectedDevice) {
        const device = deviceList.find(
          (x) => x.deviceId == lastConnectedDevice
        );
        if (device) {
          ipcRenderer.send(DEVICE_STATUS_UPDATE_CALL, {
            instanceURL,
            device,
            status: 'on',
          });
        }
      }
      setIsServerWaiting(true);
    }
    if (!hasInternet && socketConnection) {
      ipcRenderer.send(DISCONNECT_SOCKET);
      ipcRenderer.send(DISCONNECT_SOCKET_INSTANCE_1);
      ipcRenderer.send(DISCONNECT_SOCKET_INSTANCE_2);
      localStorage.setItem('thirdPartyAPIConfigInstance1', JSON.stringify(null));
      localStorage.setItem('thirdPartyAPIConfigInstance2', JSON.stringify(null));
    }
  }, [hasInternet, socketConnection]);

  useEffect(() => {
    if (!hasInternet) {
      setSocketConnection(false);
      setColorGateSocketConnection(false);
      setAlwanSocketConnection(false); // alwan
    }
  }, [hasInternet]);

  useEffect(() => {
    if (isLoggedIn) {
      const interval = setInterval(async () => {
        await ipcRenderer.send(NETWORK_CONNECTION, {});
      }, 8000);
      return () => clearInterval(interval);
    }

    if (!socketConnection) {
      ipcRenderer.send(DISCONNECT_SOCKET);
      localStorage.setItem('thirdPartyAPIConfigInstance1', JSON.stringify(null));
      localStorage.setItem('thirdPartyAPIConfigInstance2', JSON.stringify(null));
      ipcRenderer.send(DISCONNECT_SOCKET_INSTANCE_1);
      ipcRenderer.send(DISCONNECT_SOCKET_INSTANCE_2);
    }
  }, [isLoggedIn, socketConnection]);

  useEffect(() => {
    updateLocalStorageUserInfo({ hasDeviceDisconnectTimeout });
  }, [hasDeviceDisconnectTimeout]);

  useEffect(() => {
    //get info from local storage
    let userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      userInfo = JSON.parse(userInfo);
      setUsername(userInfo.username ?? null);
      setInstanceURL(userInfo.instanceURL ?? null);
      setSocketURL(userInfo.socketURL ?? null);
      setToken(userInfo.token ?? null);
      setTokenExpiry(userInfo.tokenExpiry ?? null);
      setThirdPartyAPIUser(userInfo.thirdPartyAPIUser ?? false);
      setHasDeviceDisconnectTimeout(
        userInfo.hasDeviceDisconnectTimeout ?? false
      );
      setIsNewConnection(userInfo.isNewConnection ?? true);
      if (
        userInfo.rememberUser &&
        userInfo.rememberUserTill &&
        new Date().getTime() < userInfo.rememberUserTill
      ) {
        setIsLoggedIn(true);
        setIsServerWaiting(true);
      }
      setLastDevice(userInfo.lastConnectedDevice ?? null);
    }
  }, []);

  useEffect(() => {
    if (deviceList.length && lastConnectedDevice) {
      const updatedConnectedDeviceList = deviceList.filter(
        (x) =>
          x.deviceId == lastConnectedDevice &&
          (x.status == 'connected' ? x.login == username : true)
      );
      if (updatedConnectedDeviceList.length == 0) {
        setLastConnectedDevice(null);
      }
      setConnectedDeviceList(updatedConnectedDeviceList);
    }

    if (balanceDeviceList.length && lastConnectedPBDevice) {
      const updatedConnectedPBDeviceList = balanceDeviceList.filter(
        (x) =>
          x.deviceId == lastConnectedPBDevice &&
          (x.status == 'connected' ? x.login == username : true)
      );
      if (updatedConnectedPBDeviceList.length == 0) {
        setLastConnectedPBDevice(null);
      }
      setConnectedPBDeviceList(updatedConnectedPBDeviceList);
    }
  }, [deviceList, lastConnectedDevice, balanceDeviceList, lastConnectedPBDevice]);


  useEffect(() => {
    if (!socketConnection) {
      // colorgate
      updateLocalStorageThirdPartyAPIConfig({
        colorGateSocketConnection: false,
      });
      // alwan
      updateLocalStorageAlwanAPIConfig({
        alwanSocketConnection: false,
      });
    }
  }, [socketConnection]);

  useEffect(() => {
    if (colorGateConnection) {
      clearTimeout(colorGateReConnectionTimeout);
      let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
      if (thirdPartyAPIConfig) {
        thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfig);
        const { colorGateLicense } = thirdPartyAPIConfig;
        ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
          instanceURL,
          status: 'connect',
          licence: colorGateLicense,
        });
      }
      if (colorGateConnectionInterval) return;
      colorGateConnectionInterval = setInterval(() => {
        let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
        console.log({ thirdPartyAPIConfig });
        if (thirdPartyAPIConfig) {
          const { auth, apiBaseURL, port } = JSON.parse(thirdPartyAPIConfig);
          const requestObj = {
            colorGateAPI: {
              request: {
                baseURL: `${apiBaseURL}:${port}`,
                url: '/v1/system/status',
                method: 'get',
                timeout: 5000,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                  Authorization: `Basic ${auth}`,
                },
              },
            },
          };
          console.log('===> sending colorGate api connection');
          ipcRenderer.send(CHECK_COLOR_GATE_API_CONNECTION, requestObj);
        }
      }, 7000);
    } else {
      //if connection is failed and then start interval to check connection for 20minutes
      let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
      if (thirdPartyAPIConfig) {
        thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfig);
        const { auth, apiBaseURL, port, colorGateLicense } =
          thirdPartyAPIConfig;
        if (
          auth &&
          apiBaseURL &&
          port &&
          colorGateLicense &&
          thirdPartyAPIUser
        ) {
          // send colorGate disconnect call to update status on cma site
          setInstanceURL((url) => {
            ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
              instanceURL: url,
              status: 'disconnect',
              licence: colorGateLicense,
            });
            return url;
          });
          // set timeout to display colorGate Error
          colorGateReConnectionTimeout = setTimeout(() => {
            setColorGatePopupTitle('API Server disconnected');
            setColorGatePopupError(
              'Please restart the connection from the third party software. After return in CMA Connect, click on the API Connector and Check Connection & Save on its respective software tab.'
            );
            clearInterval(colorGateConnectionInterval);
            colorGateConnectionInterval = null;
          }, 1000 * 60 * 20);
        } else {
          clearInterval(colorGateConnectionInterval);
          colorGateConnectionInterval = null;
        }
      } else {
        clearInterval(colorGateConnectionInterval);
        colorGateConnectionInterval = null;
      }
    }
  }, [colorGateConnection]);

  // alwan
  useEffect(() => {
    if (alwanConnection) {
      clearTimeout(alwanReConnectionTimeout);
      let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
      if (alwanAPIConfig) {
        alwanAPIConfig = JSON.parse(alwanAPIConfig);
        const { alwanLicense } = alwanAPIConfig;
        ipcRenderer.send(CMA_API_FOR_ALWAN_STATUS_UPDATE, {
          instanceURL,
          status: 'connect',
          licence: alwanLicense,
        });
      }
      if (alwanConnectionInterval) return;
      alwanConnectionInterval = setInterval(() => {
        let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
        console.log({ alwanAPIConfig });
        if (alwanAPIConfig) {
          const { auth, apiBaseURL, port } = JSON.parse(alwanAPIConfig);
          const requestObj = {
            alwanAPI: {
              request: {
                baseURL: `${apiBaseURL}:${port}`,
                url: '/info',
                method: 'get',
                timeout: 5000,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache',
                  Authorization: `Basic ${auth}`,
                },
              },
            },
          };
          console.log('===> sending alwan api connection');
          ipcRenderer.send(CHECK_ALWAN_API_CONNECTION, requestObj);
        }
      }, 7000);
    } else {
      //if connection is failed and then start interval to check connection for 20minutes
      let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
      if (alwanAPIConfig) {
        alwanAPIConfig = JSON.parse(alwanAPIConfig);
        const { auth, apiBaseURL, port, alwanLicense } = alwanAPIConfig;
        if (auth && apiBaseURL && port && alwanLicense && thirdPartyAPIUser) {
          // send alwan disconnect call to update status on cma site
          setInstanceURL((url) => {
            ipcRenderer.send(CMA_API_FOR_ALWAN_STATUS_UPDATE, {
              instanceURL: url,
              status: 'disconnect',
              licence: alwanLicense,
            });
            return url;
          });
          // set timeout to display alwan Error
          alwanReConnectionTimeout = setTimeout(() => {
            setAlwanPopupTitle('API Server disconnected');
            setAlwanPopupError(
              'Please restart the connection from the third party software. After return in CMA Connect, click on the API Connector and Check Connection & Save on its respective software tab.'
            );
            clearInterval(alwanConnectionInterval);
            alwanConnectionInterval = null;
          }, 1000 * 60 * 20);
        } else {
          clearInterval(alwanConnectionInterval);
          alwanConnectionInterval = null;
        }
      } else {
        clearInterval(alwanConnectionInterval);
        alwanConnectionInterval = null;
      }
    }
  }, [alwanConnection]);

  useEffect(() => {
    let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
    if (thirdPartyAPIConfig) {
      thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfig);
      const { colorGateLicense } = thirdPartyAPIConfig;
      if (colorGateLicense) {
        if (colorGateConnection && colorGateSocketConnection) {
          //call connect colorGate api
          console.log(' === calling connect colorGate api === ');
          ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
            instanceURL,
            status: 'connect',
            licence: colorGateLicense,
          });
        }
        if (!colorGateConnection && colorGateSocketConnection) {
          ipcRenderer.send(COLOR_GATE_SERVER_CONNECTION_REQ, {
            isConnected: true,
            colorGateLicense,
          });
        }
        if (colorGateConnection && !colorGateSocketConnection) {
          ipcRenderer.send(COLOR_GATE_SERVER_CONNECTION_REQ, {
            isConnected: false,
            colorGateLicense,
          });
        }
      }
    }
  }, [colorGateConnection, colorGateSocketConnection]);

  // alwan
  useEffect(() => {
    let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
    if (alwanAPIConfig) {
      alwanAPIConfig = JSON.parse(alwanAPIConfig);
      const { alwanLicense } = alwanAPIConfig;
      if (alwanLicense) {
        if (alwanConnection && alwanSocketConnection) {
          //call connect alwan api
          console.log(' === calling connect alwan api === ');
          ipcRenderer.send(CMA_API_FOR_ALWAN_STATUS_UPDATE, {
            instanceURL,
            status: 'connect',
            licence: alwanLicense,
          });
        }
        if (!alwanConnection && alwanSocketConnection) {
          ipcRenderer.send(ALWAN_SERVER_CONNECTION_REQ, {
            isConnected: true,
            alwanLicense,
          });
        }
        if (alwanConnection && !alwanSocketConnection) {
          ipcRenderer.send(ALWAN_SERVER_CONNECTION_REQ, {
            isConnected: false,
            alwanLicense,
          });
        }
      }
    }
  }, [alwanConnection, alwanSocketConnection]);

  useEffect(() => {
    const handleAppCloseRequest = async () => {
      const shouldDisconnectDevice = isLoggedIn && (lastDevice || lastPBDevice || lastBarcodeDevice || lastZebraDevice);

      if (shouldDisconnectDevice) {
        const confirmDisconnect = window.confirm('Are you sure you want to disconnect the device before closing the application?');

        if (confirmDisconnect) {
          const disconnectDevices = async () => {
            const disconnectDevice = async (device) => {
              if (device) {
                ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
                  instanceURL,
                  deviceName: device.deviceType,
                  deviceId: device.deviceId,
                });
                ipcRenderer.send(DISCONNECT_DEVICE, device);
                await new Promise((resolve) => setTimeout(resolve, 500)); // Delay between disconnecting devices
              }
            };

            await disconnectDevice(deviceList.find((device) => device.deviceId === lastDevice));
            await disconnectDevice(balanceDeviceList.find((device) => device.deviceId === lastPBDevice));
            await disconnectDevice(barcodeDeviceList.find((device) => device.deviceId === lastBarcodeDevice));
            await disconnectDevice(zebraDeviceList.find((device) => device.deviceId === lastZebraDevice));
          };

          await disconnectDevices();
          ipcRenderer.send(APP_CLOSE_CONFIRMED);
        }
      } else {
        ipcRenderer.send(APP_CLOSE_CONFIRMED);
      }
    };

    ipcRenderer.on(APP_REQUEST_CLOSE, handleAppCloseRequest);

    return () => {
      ipcRenderer.removeListener(APP_REQUEST_CLOSE, handleAppCloseRequest);
    };
  }, [isLoggedIn, lastDevice, lastPBDevice, lastBarcodeDevice, lastZebraDevice]);

  // I1IO3 function
  const onCurrentAction = (event, args) => {
    console.log({ action: args });
    setCurrentI1IO3Action(args);
  };

  //colorGate functions

  const onColorGateServerConnectionRes = (_, args) => {
    console.log('onColorGateServerConnectionRes APP jsx');
    setSocketConnectionInProgress(false);
    const isConnected = args?.colorGateServerConnection?.isConnected;
    if (args?.colorGateServerConnection?.error) {
      setColorGatePopupTitle('User Licence Error');
      setColorGatePopupError(args.colorGateServerConnection.error.message);
    }
    console.log({ colorGateSocketConnection, args, isConnected });
    setColorGateSocketConnection((prevStatus) => {
      console.log({ prevStatus, isConnected });
      if (prevStatus && !isConnected) {
        updateLocalStorageThirdPartyAPIConfig({
          colorGateSocketConnection: false,
        });
        return false;
      }
      if (!prevStatus && isConnected) {
        updateLocalStorageThirdPartyAPIConfig({
          colorGateSocketConnection: true,
        });
        return true;
      }
      return prevStatus;
    });
  };

  // alwan
  const onAlwanServerConnectionRes = (_, args) => {
    console.log('onAlwanServerConnectionRes APP jsx');
    setAlwanSocketConnectionInProgress(false);
    const isConnected = args?.alwanServerConnection?.isConnected;
    if (args?.alwanServerConnection?.error) {
      setAlwanPopupTitle('User Licence Error');
      setAlwanPopupError(args.alwanServerConnection.error.message);
    }
    console.log({ alwanSocketConnection, args, isConnected });
    setAlwanSocketConnection((prevStatus) => {
      console.log({ prevStatus, isConnected });
      if (prevStatus && !isConnected) {
        updateLocalStorageAlwanAPIConfig({
          alwanSocketConnection: false,
        });
        return false;
      }
      if (!prevStatus && isConnected) {
        updateLocalStorageAlwanAPIConfig({
          alwanSocketConnection: true,
        });
        return true;
      }
      return prevStatus;
    });
  };

  const onColorGateAPIConnectionResponse = (_, args) => {
    if (
      args.colorGateAPI?.response?.data &&
      args.colorGateAPI?.response?.data?.status?.code == 200
    ) {
      setColorGateConnection(true);
    } else {
      setColorGateConnection(false);
    }
  };

  // alwan
  const onAlwanAPIConnectionResponse = (_, args) => {
    if (args?.status && args.status == 200) {
      setAlwanConnection(true);
    } else {
      setAlwanConnection(false);
    }
  };

  const updateLocalStorageThirdPartyAPIConfig = (obj) => {
    console.log('updateLocalStorage');
    console.log({ obj });
    const thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
    const newConfig = {
      ...JSON.parse(thirdPartyAPIConfig),
      ...obj,
    };
    localStorage.setItem('thirdPartyAPIConfig', JSON.stringify(newConfig));
  };

  // alwan
  const updateLocalStorageAlwanAPIConfig = (obj) => {
    const alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
    const newConfig = {
      ...JSON.parse(alwanAPIConfig),
      ...obj,
    };
    localStorage.setItem('alwanAPIConfig', JSON.stringify(newConfig));
  };

  const onColorGateAPILog = (_, args) => {
    setColorGateAPILog((currentLogs) => {
      console.log({ currentLogs });
      if (args.log) {
        let newLog = [...currentLogs];
        newLog.push(args.log);
        if (newLog.length > 10) {
          newLog = newLog.slice(-10);
        }
        console.log({ newLog });
        return newLog;
      }
      return currentLogs;
    });
  };

  // alwan
  const onAlwanAPILog = (_, args) => {
    setAlwanAPILog((currentLogs) => {
      console.log({ currentLogs });
      if (args.log) {
        let newLog = [...currentLogs];
        newLog.push(args.log);
        if (newLog.length > 10) {
          newLog = newLog.slice(-10);
        }
        console.log({ newLog });
        return newLog;
      }
      return currentLogs;
    });
  };

  const onColorGateConnectionCheckReq = (_, args) => {
    let colorGateUsername = null;
    let connection = null;
    let licence = null;
    let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
    if (thirdPartyAPIConfig) {
      thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfig);
      const { auth, colorGateConnection, colorGateLicense } =
        thirdPartyAPIConfig;
      connection = colorGateConnection;
      licence = colorGateLicense;
      if (auth) {
        const decodedAuth = atob(auth) ?? null;
        if (decodedAuth) {
          const [username, password] = decodedAuth.split(':');
          colorGateUsername = username;
        }
      }
    }
    let content = {
      ...args,
      colorGateConnectionCheck: {
        username: colorGateUsername,
        connection,
        licence,
      },
    };
    ipcRenderer.send(COLOR_GATE_CONNECTION_CHECK_RES, content);
  };

  // alwan
  const onAlwanConnectionCheckReq = (_, args) => {
    let alwanUsername = null;
    let connection = null;
    let licence = null;
    let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
    if (alwanAPIConfig) {
      alwanAPIConfig = JSON.parse(alwanAPIConfig);
      const { auth, alwanConnection, alwanLicense } = alwanAPIConfig;
      connection = alwanConnection;
      licence = alwanLicense;
      if (auth) {
        const decodedAuth = atob(auth) ?? null;
        if (decodedAuth) {
          const [username, password] = decodedAuth.split(':');
          alwanUsername = username;
        }
      }
    }
    let content = {
      ...args,
      alwanConnectionCheck: {
        username: alwanUsername,
        connection,
        licence,
      },
    };
    ipcRenderer.send(ALWAN_CONNECTION_CHECK_RES, content);
  };

  //auto-update functions
  const onCheckForUpdate = (_, args) => {
    setCheckUpdate(false);
    if (args.updateAvailable) {
      if (args.updateInfo?.version) {
        setUpdateStatus(`New version v${args.updateInfo.version} available`);
      } else {
        setUpdateStatus('New version available');
      }
      setIsNewUpdateAvailable(true);
      setUpdateInfo(args.updateInfo);
      setUpdateDownloaded(false);
      // if update available then redirect to update page if not
      if (!showCheckUpdatePage) {
        setShowCheckUpdatePage(true);
      }
    } else {
      setUpdateStatus('No updates');
      setIsNewUpdateAvailable(false);
      setUpdateInfo(null);
    }
  };

  const onDownloadUpdate = (_, args) => {
    setDownloadStarted(false);
    setUpdateDownloaded(true);
    if (updateInfo && updateInfo.version) {
      setUpdateStatus(`New version v${updateInfo.version} has been downloaded`);
    } else {
      setUpdateStatus('New version has been downloaded');
    }
  };

  const onUpdateError = (_, args) => {
    setDownloadStarted(false);
    setUpdateError(args.message ?? 'Unknown Error');
    setCheckUpdate(false);
  };

  const handleCheckUpdate = (_, args) => {
    setCheckUpdate(true);
    setUpdateStatus('Checking for new version...');
    setUpdateInfo(null);
    ipcRenderer.send(CHECK_FOR_UPDATE, null);
  };

  const handleDownloadUpdate = (_, args) => {
    setDownloadStarted(true);
    if (updateInfo.version) {
      setUpdateStatus(
        `Downloading new version v${updateInfo.version}, please wait...`
      );
    } else {
      setUpdateStatus('Downloading new version, please wait...');
    }
    ipcRenderer.send(DOWNLOAD_UPDATE, null);
  };

  const handleQuitAndInstall = (_, args) => {
    setUpdateStatus('Preparing to quite...');
    ipcRenderer.send(QUIT_AND_INSTALL, null);
  };

  const onDownloadProgress = (_, args) => {
    setDownloadProgress(args);
  };

  const handleCheckUpdatePage = () => {
    setShowCheckUpdatePage(true);
  };

  const hideCheckUpdatePage = () => {
    setShowCheckUpdatePage(false);
  };

  const handleNewConnection = (obj) => {
    const userInfo = {
      username: obj.username,
      instanceURL: obj.instanceURL,
      token: obj.token,
      tokenExpiry: obj.tokenExpiry,
      isNewConnection: false,
      socketURL: obj.socketURL,
      thirdPartyAPIUser: obj.thirdPartyAPIUser,
    };
    setUsername(obj.username ?? null);
    setInstanceURL(obj.instanceURL ?? null);
    setSocketURL(obj.socketURL ?? null);
    setToken(obj.token ?? null);
    setTokenExpiry(obj.tokenExpiry ?? null);
    setThirdPartyAPIUser(obj.thirdPartyAPIUser ?? false);
    setIsNewConnection(false);
    setIsServerWaiting(true);
    setIsLoggedIn(true);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  };

  const afterDeviceDisconnectionCall = (_, args) => {
    ipcRenderer.send(DISCONNECT_DEVICE_FROM_SERVER, args);
  };

  const onSocketConnection = (_, args) => {
    if (args) {
      setSocketConnection(true);
    } else {
      setSocketConnection(false);
      setColorGateSocketConnection(false);
      setAlwanSocketConnection(false); // alwan
    }
  };

  const checkOnlineStatus = (_, args) => {
    if (args.status) {
      setNetworkConnection(true);
    } else {
      setNetworkConnection(false);
      setHasInternet(false);
    }
  };

  const onVerifyDeviceConnection = (_, args) => {
    handleServerConnection();
  };

  const onClientSocketAlreadyExist = (_, args) => {
    // handleLogout();
    setServerError(
      args
        ? 'CMA Connect User ID is currently open in another session. Please try again after logging out from the other session.'
        : ''
    );
    setSocketConnection(false);
    setColorGateSocketConnection(false);
    setAlwanSocketConnection(false);
  };

  const onShowDialog = (_, args) => {
    if (args.message == 'Requested CMA-connect client is already available') {
      setServerError(
        'CMA Connect User ID is currently open in another session. Please try again after logging out from the other session.'
      );
    } else if (args.message == 'Requested CMA client not found') {
      //do nothing
    }
  };

  const handleCreateNewConnection = () => {
    localStorage.setItem('userInfo', JSON.stringify({}));
    setUsername(null);
    setInstanceURL(null);
    setToken(null);
    setTokenExpiry(null);
    setSocketURL(null);
    setIsNewConnection(true);
    setLastConnectedDevice(null);
    setLastDevice(null);
    setThirdPartyAPIUser(false);
    setShowThirdPartyAPIPage(false);
    ipcRenderer.send(CURRENT_TAB_UPDATE, 1);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };

  const getTimeAfterNDay = (n) => {
    return new Date().getTime() + n * 24 * 60 * 60 * 1000;
  };

  const updateLocalStorageUserInfo = (obj) => {
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      ...obj,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  const handleLogin = (obj) => {
    let rememberTill = null;
    if (obj.remember) {
      rememberTill = getTimeAfterNDay(7);
    }
    const userInfo = {
      username: obj.username,
      socketURL: obj.socketURL,
      instanceURL: instanceURL,
      isNewConnection: false,
      rememberUser: obj.remember,
      rememberUserTill: rememberTill,
      thirdPartyAPIUser: obj.thirdPartyAPIUser,
    };
    updateLocalStorageUserInfo(userInfo);
    setUsername(obj.username ?? null);
    setSocketURL(obj.socketURL ?? null);
    setThirdPartyAPIUser(obj.thirdPartyAPIUser ?? null);
    setIsServerWaiting(true);
    setIsNewConnection(false);
    setIsLoggedIn(true);
    ipcRenderer.send(CURRENT_TAB_UPDATE, 1);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };

  const handleServerConnection = () => {
    setIsServerWaiting(false);
  };

  const handleDeviceConnection = (deviceId) => {
    const device = deviceList.find((x) => x.deviceId == deviceId);
    const deviceName = device?.deviceType;
    setLastDevice(device?.deviceId);
    setLastConnectedDevice(device?.deviceId);

    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedDevice: device?.deviceId,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    //set device disconnect timeout if flag is true
    setHasDeviceDisconnectTimeout((flag) => {
      ipcRenderer.send(DEVICE_DISCONNECT_TIMEOUT, {
        hasTimeout: flag,
        deviceType: deviceName,
      });
      return flag;
    });
  };

  const handlePBDeviceConnection = (deviceId) => {
    const device = balanceDeviceList.find((x) => x.deviceId == deviceId);
    const deviceName = device?.deviceType;
    setLastPBDevice(device?.deviceId);
    setLastConnectedPBDevice(device?.deviceId);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedPBDevice: device?.deviceId,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    //set device disconnect timeout if flag is true
    setHasDeviceDisconnectTimeout((flag) => {
      ipcRenderer.send(DEVICE_DISCONNECT_TIMEOUT, {
        hasTimeout: flag,
        deviceType: deviceName,
      });
      return flag;
    });
  }

  const handleBarcodeDeviceConnection = (deviceId) => {
    const device = barcodeDeviceList.find((x) => x.deviceId == deviceId);
    const deviceName = device?.deviceType;
    setLastBarcodeDevice(device?.deviceId);
    setLastConnectedBarcode(device?.deviceId);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedBarcode: device?.deviceId,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    //set device disconnect timeout if flag is true
    setHasDeviceDisconnectTimeout((flag) => {
      ipcRenderer.send(DEVICE_DISCONNECT_TIMEOUT, {
        hasTimeout: flag,
        deviceType: deviceName,
      });
      return flag;
    });
  }
  const handleZebraDeviceConnection = (deviceId) => {
    const device = zebraDeviceList.find((x) => x.deviceId == deviceId);
    const deviceName = device?.deviceType;
    setLastZebraDevice(device?.deviceId);
    setLastConnectedZebra(device?.deviceId);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedZebra: device?.deviceId,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    //set device disconnect timeout if flag is true
    setHasDeviceDisconnectTimeout((flag) => {
      ipcRenderer.send(DEVICE_DISCONNECT_TIMEOUT, {
        hasTimeout: flag,
        deviceType: deviceName,
      });
      return flag;
    });
  }

  const handleDeviceDisconnect = (deviceId) => {
    if (!deviceId) return;

    const device = deviceList.find((x) => x.deviceId == deviceId);
    if (!device) return;
    // call disconnect device
    ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
      instanceURL,
      deviceName: device?.deviceType,
      deviceId: deviceId,
    });

    //set deviceChangeFrom to null
    setDeviceChangeFrom(null);

    // send call to remove device available device list on server
    ipcRenderer.send(DISCONNECT_DEVICE, device);
    setConnectedDeviceList([]);
    setLastConnectedDevice(null);
    setLastDevice(null);

    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedDevice: null,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  const handlePBDeviceDisconnect = (deviceId) => {
    if (!deviceId) return;
    const device = balanceDeviceList.find((x) => x.deviceId == deviceId);
    if(!device){
      return;
    }
    // call disconnect device
    ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
      instanceURL,
      deviceName: device?.deviceType,
      deviceId: deviceId,
    });
    //set deviceChangeFrom to null
    setDeviceChangeFrom(null);
    // send call to remove device available device list on server
    ipcRenderer.send(DISCONNECT_DEVICE, device);
    setConnectedPBDeviceList([]);
    setLastConnectedPBDevice(null);
    setLastPBDevice(null);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedPBDevice: null,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  const handleBarcodeDeviceDisconnect = (deviceId) => {
    if (!deviceId) return;
    const device = barcodeDeviceList.find((x) => x.deviceId == deviceId);
    if(!device){
      return;
    }
    // call disconnect device
    ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
      instanceURL,
      deviceName: device?.deviceType,
      deviceId: deviceId,
    });
    //set deviceChangeFrom to null
    setDeviceChangeFrom(null);
    // send call to remove device available device list on server
    ipcRenderer.send(DISCONNECT_DEVICE, device);
    setConnectedBarcodeList([]);
    setLastConnectedBarcode(null);
    setLastBarcodeDevice(null);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedBarcode: null,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  const handleZebraDeviceDisconnect = (deviceId) => {
    if (!deviceId) return;
    const device = zebraDeviceList.find((x) => x.deviceId == deviceId);
    if(!device){
      return;
    }
    // call disconnect device
    ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
      instanceURL,
      deviceName: device?.deviceType,
      deviceId: deviceId,
    });
    //set deviceChangeFrom to null
    setDeviceChangeFrom(null);
    // send call to remove device available device list on server
    ipcRenderer.send(DISCONNECT_DEVICE, device);
    setConnectedZebraList([]);
    setLastConnectedZebra(null);
    setLastZebraDevice(null);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedZebra: null,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  const handleDeviceReconnect = (deviceId) => {
    if (!deviceId) return;

    const device = deviceList.find((x) => x.deviceId === deviceId);
    if (!device) return;

    ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
  };

  const handlePBDeviceReconnect = (deviceId) => {
    if (!deviceId) return;

    const device = balanceDeviceList.find((x) => x.deviceId === deviceId);
    if (!device) return;

    ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
  };

  const handleBarcodeDeviceReconnect = (deviceId) => {
    if (!deviceId) return;

    const device = barcodeDeviceList.find((x) => x.deviceId === deviceId);
    if (!device) return;

    ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
  };

  const handleZebraDeviceReconnect = (deviceId) => {
    if (!deviceId) return;

    const device = zebraDeviceList.find((x) => x.deviceId === deviceId);
    if (!device) return;

    ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
  };

  const handleSelectOtherDevice = (deviceId) => {
    //clear device disconnection timeout
    ipcRenderer.send(DEVICE_DISCONNECT_TIMEOUT, {
      hasTimeout: false,
      deviceType: null,
    });

    if (!deviceId) return;

    //set deviceChangeFrom to null
    setDeviceChangeFrom(null);
    setConnectedDeviceList([]);
    setLastConnectedDevice(null);
    setLastDevice(null);

    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      lastConnectedDevice: null,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  const handleChangeDevice = () => {
    setDeviceChangeFrom(lastConnectedDevice);
    setLastConnectedDevice(null);
    setConnectedDeviceList([]);
  };

  const goBackToMeasureScreen = () => {
    if (deviceList.length) {
      const updatedConnectedDeviceList = deviceList.filter(
        (x) => x.deviceId == deviceChangeFrom
      );
      setConnectedDeviceList(updatedConnectedDeviceList);
      setLastConnectedDevice(deviceChangeFrom);
    }
  };

  const handleLastDeviceDisconnection = () => {
    setLastDevice(null);
    setLastConnectedDevice(null);
  };

  const handleLastPBDeviceDisconnection = () => {
    setLastPBDevice(null);
    setLastConnectedPBDevice(null);
  };

  const handleLastBarcodeDeviceDisconnection = () => {
    setLastBarcodeDevice(null);
    setLastConnectedBarcode(null);
  };

  const handleLastZebraDeviceDisconnection = () => {
    setLastZebraDevice(null);
    setLastConnectedZebra(null);
  };

  const handleGetDeviceAndLicenses = (args) => {
    if (args.deviceRes.res) {
      updateDeviceList(args.deviceRes.devices);
    }
    if (args.licenseRes.res) {
      setLicenses(args.licenseRes.licenses);
    }
  };

  const updateDeviceList = (devices) => {
    if (devices) {
      let newDeviceList = [];
      let newBalanceDeviceList = [];
      let newBarcodeDeviceList = [];
      let newZebraDeviceList = [];

      for (const dev in devices) {

        if(devices[dev].is_precision_balance){
          newBalanceDeviceList.push({ ...devices[dev], deviceId: dev });
        }
        else if(devices[dev].deviceType === 'barcode_reader'){
          newBarcodeDeviceList.push({ ...devices[dev], deviceId: dev });
        }
        else if(devices[dev].deviceType === 'label_printer'){
          newZebraDeviceList.push({ ...devices[dev], deviceId: dev });
        }
        else{
          newDeviceList.push({ ...devices[dev], deviceId: dev });
        }
      }

      //check if system is mac, then should not include ci6x devices
      newDeviceList = newDeviceList.filter(
        (dev) =>
          !(
            process.platform == "darwin" &&
            ["CI62", "CI64", "CI64UV"].includes(dev.deviceType)
          )
      );
      setBalanceDeviceList(newBalanceDeviceList)
      setBarcodeDeviceList(newBarcodeDeviceList)
      setZebraDeviceList(newZebraDeviceList)
      setDeviceList(newDeviceList);
      if (deviceChangeFrom) {
        const updatedConnectedDeviceList = newDeviceList.filter((x) => {
          return (
            x.deviceId === deviceChangeFrom &&
            (x.status === "connected" ? x.login === username : true)
          );
        });

        if (updatedConnectedDeviceList.length === 0) {
          setDeviceChangeFrom(null);
        }
      }
    }
  };

  const handleLogout = () => {
    setServerError('');
    setSocketConnection(false);

    // colorgate
    clearInterval(colorGateConnectionInterval);
    colorGateConnectionInterval = null;
    clearTimeout(colorGateReConnectionTimeout);
    colorGateReConnectionTimeout = null;

    // alwan
    clearInterval(alwanConnectionInterval);
    alwanConnectionInterval = null;
    clearTimeout(alwanReConnectionTimeout);
    alwanReConnectionTimeout = null;

    // colorgate
    setColorGateConnection(false);
    setColorGateSocketConnection(false);
    setSocketConnectionInProgress(false);

    // alwan
    setAlwanConnection(false);
    setAlwanSocketConnection(false);
    setAlwanSocketConnectionInProgress(false);

    ipcRenderer.send(DEVICE_DISCONNECT_TIMEOUT, { hasTimeout: false });

    if (lastDevice) {
      // setLastDevice(lastConnectedDevice);
      const deviceToDisconnect = deviceList.find(
        (device) => device.deviceId == lastDevice
      );
      if (deviceToDisconnect) {
        ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
          instanceURL,
          deviceName: deviceToDisconnect?.deviceType,
          deviceId: deviceToDisconnect?.deviceId,
        });

        ipcRenderer.send(DISCONNECT_DEVICE, deviceToDisconnect);

        setConnectedDeviceList([]);
        setLastConnectedDevice(null);
        setLastDevice(null);
      }
    }
    if(lastPBDevice){
      const pbDeviceToDisconnect = balanceDeviceList.find(
        (device) => device.deviceId == lastPBDevice
      );
      if (pbDeviceToDisconnect) {
        ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
          instanceURL,
          deviceName: pbDeviceToDisconnect?.deviceType,
          deviceId: pbDeviceToDisconnect?.deviceId,
        });

        ipcRenderer.send(DISCONNECT_DEVICE, pbDeviceToDisconnect);

        setConnectedPBDeviceList([]);
        setLastConnectedPBDevice(null);
        setLastPBDevice(null);
      }
    }

    if(lastBarcodeDevice){
      const barcodeDeviceToDisconnect = barcodeDeviceList.find(
        (device) => device.deviceId == lastBarcodeDevice
      );
      if (barcodeDeviceToDisconnect) {
        ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
          instanceURL,
          deviceName: barcodeDeviceToDisconnect?.deviceType,
          deviceId: barcodeDeviceToDisconnect?.deviceId,
        });

        ipcRenderer.send(DISCONNECT_DEVICE, barcodeDeviceToDisconnect);

        setConnectedBarcodeList([]);
        setLastConnectedBarcode(null);
        setLastBarcodeDevice(null);
      }
    }

    if(lastZebraDevice){
      const zebraDeviceToDisconnect = zebraDeviceList.find(
        (device) => device.deviceId == lastZebraDevice
      );
      if (zebraDeviceToDisconnect) {
        ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
          instanceURL,
          deviceName: zebraDeviceToDisconnect?.deviceType,
          deviceId: zebraDeviceToDisconnect?.deviceId,
        });

        ipcRenderer.send(DISCONNECT_DEVICE, zebraDeviceToDisconnect);

        setConnectedZebraList([]);
        setLastConnectedZebra(null);
        setLastZebraDevice(null);
      }
    }

    setDeviceChangeFrom(null);
    setShowThirdPartyAPIPage(false);
    ipcRenderer.send(DISCONNECT_SOCKET);
    localStorage.setItem('thirdPartyAPIConfigInstance1', JSON.stringify(null));
    localStorage.setItem('thirdPartyAPIConfigInstance2', JSON.stringify(null));
    ipcRenderer.send(DISCONNECT_SOCKET_INSTANCE_1);
    ipcRenderer.send(DISCONNECT_SOCKET_INSTANCE_2);
    const userInfo = localStorage.getItem('userInfo');
    const newUserInfo = {
      ...JSON.parse(userInfo),
      rememberUser: false,
      rememberUserTill: null,
    };
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
    // colorgate
    updateLocalStorageThirdPartyAPIConfig({
      colorGateSocketConnection: false,
      colorGateConnection: false,
    });
    // alwan
    updateLocalStorageAlwanAPIConfig({
      alwanSocketConnection: false,
      alwanConnection: false,
    });
    setIsLoggedIn(false);
  };

  const handleNetworkRetry = () => {
    //if network connection is on and 50 sec wait for socket close is over
    //then setHasInternet to true to re-establish socket connection
    if (networkConnection && !waitForReconnection) {
      setHasInternet(true);
      setIsServerWaiting(true);
    }
  };

  const handleThirdPartyAPI = (value) => {
    setShowThirdPartyAPIPage(value);
  };

  const renderView = () => {
    if (showDialog) {
      return (
        <PopupModal
          title={dialogTitle}
          message={dialogMessage}
          confirmBtnText="OK"
          onConfirm={() => setShowDialog(false)}
        />
      );
    } else if (!hasInternet && isLoggedIn) {
      return (
        <InternetConnectionLost
          onRetry={handleNetworkRetry}
          showThirdPartyAPIPage={showThirdPartyAPIPage}
          networkConnection={networkConnection}
        />
      );
    } else if (isNewConnection) {
      //first time connection
      return (
        <NewConnection
          preUsername={username}
          afterNewConnection={handleNewConnection}
        />
      );
    } else if (!isNewConnection && !isLoggedIn) {
      //when first time connection is done and use is not logged in
      return (
        <Login
          preUsername={username}
          instanceURL={instanceURL}
          token={token}
          afterLogin={handleLogin}
          onCreateNewConnection={handleCreateNewConnection}
        />
      );
    } else if (showCheckUpdatePage) {
      return (
        <AppUpdate
          isNewUpdateAvailable={isNewUpdateAvailable}
          updateInfo={updateInfo}
          updateDownloaded={updateDownloaded}
          updateStatus={updateStatus}
          updateError={updateError}
          checkUpdate={checkUpdate}
          downloadProgress={downloadProgress}
          downloadStarted={downloadStarted}
          handleCheckUpdate={handleCheckUpdate}
          handleCheckUpdatePage={handleCheckUpdatePage}
          handleQuitAndInstall={handleQuitAndInstall}
          handleDownloadUpdate={handleDownloadUpdate}
          handleGoBack={hideCheckUpdatePage}
        />
      );
    } else if (isServerWaiting) {
      //when waiting for socket connection
      return (
        <ServerConnection
          lastDevice={lastDevice}
          connectedPBDevice={lastConnectedPBDevice}
          lastConnectedBarcode={lastConnectedBarcode}
          lastConnectedZebra={lastConnectedZebra}
          onServerConnection={handleServerConnection}
          onDeviceConnection={handleDeviceConnection}
          onDevicePBConnection={handlePBDeviceConnection}
          onDeviceBarcodeConnection={handleBarcodeDeviceConnection}
          onDeviceZebraConnection={handleZebraDeviceConnection}
          onDeviceDisconnect={handleLastDeviceDisconnection}
          username={username}
          onLogout={handleLogout}
          instanceURL={instanceURL}
          socketURL={socketURL}
          token={token}
          onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
          serverError={serverError}
          handleCheckUpdate={handleCheckUpdatePage}
          isNewUpdateAvailable={isNewUpdateAvailable}
          onDeviceReConnect={handleDeviceReconnect}
          onPBDeviceReConnect={handlePBDeviceReconnect}
          onZebraDeviceReConnect={handleZebraDeviceReconnect}
          onBarcodeDeviceReConnect={handleBarcodeDeviceReconnect}
          onPBDeviceDisconnect={handleLastPBDeviceDisconnection}
          onBarcodeDeviceDisconnect={handleLastBarcodeDeviceDisconnection}
          onZebraDeviceDisconnect={handleLastZebraDeviceDisconnection}


        />
      );
    } else if (isPrecisionShow) {
      return (
        <DevicePrecision
        username={username}
        deviceList={deviceList}
        licenses={licenses}
        instanceURL={instanceURL}
        token={token}
        onDeviceConnected={handlePBDeviceConnection}
        onDeviceDisConnect={handlePBDeviceDisconnect}
        onGoBackToMeasure={goBackToMeasureScreen}
        onLogout={handleLogout}
        onHasDeviceDisconnectTimeout={(res) =>
          setHasDeviceDisconnectTimeout(res)
        }
        connectedPBDevice={lastConnectedPBDevice}
        onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
        handleCheckUpdate={handleCheckUpdatePage}
        isNewUpdateAvailable={isNewUpdateAvailable}
        onThirdPartyAPI={handleThirdPartyAPI}
        showThirdPartyAPIPage={showThirdPartyAPIPage}
        colorGateAPILog={colorGateAPILog}
        socketConnection={socketConnection}
        thirdPartyAPIUser={thirdPartyAPIUser}
        colorGateConnection={colorGateConnection}
        setColorGateConnection={setColorGateConnection}
        colorGateSocketConnection={colorGateSocketConnection}
        colorGatePopupError={colorGatePopupError}
        colorGatePopupTitle={colorGatePopupTitle}
        setColorGatePopupError={setColorGatePopupError}
        socketConnectionInProgress={socketConnectionInProgress}
        setSocketConnectionInProgress={setSocketConnectionInProgress}
        alwanAPILog={alwanAPILog}
        alwanConnection={alwanConnection}
        setAlwanConnection={setAlwanConnection}
        alwanSocketConnection={alwanSocketConnection}
        alwanPopupError={alwanPopupError}
        alwanPopupTitle={alwanPopupTitle}
        setAlwanPopupError={setAlwanPopupError}
        alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
        setAlwanSocketConnectionInProgress={
          setAlwanSocketConnectionInProgress
        }
        balanceDeviceList={balanceDeviceList}
        setisPrecisionShow={setisPrecisionShow}
        barcodeDeviceList={barcodeDeviceList}
        setIsBarcodeOnShow={setIsBarcodeOnShow}
        zebraDeviceList={zebraDeviceList}
        setIsZebraOnShow={setIsZebraOnShow}
        />
      );
    } else if(isBarcodeOnShow){
      return (
        <DeviceBarcode
        username={username}
        deviceList={deviceList}
        licenses={licenses}
        instanceURL={instanceURL}
        token={token}
        onDeviceConnected={handleBarcodeDeviceConnection}
        onDeviceDisConnect={handleBarcodeDeviceDisconnect}
        onGoBackToMeasure={goBackToMeasureScreen}
        onLogout={handleLogout}
        onHasDeviceDisconnectTimeout={(res) =>
         setHasDeviceDisconnectTimeout(res)
        }
        lastConnectedBarcode={lastConnectedBarcode}
        onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
        handleCheckUpdate={handleCheckUpdatePage}
        isNewUpdateAvailable={isNewUpdateAvailable}
        onThirdPartyAPI={handleThirdPartyAPI}
        showThirdPartyAPIPage={showThirdPartyAPIPage}
        colorGateAPILog={colorGateAPILog}
        socketConnection={socketConnection}
        thirdPartyAPIUser={thirdPartyAPIUser}
        colorGateConnection={colorGateConnection}
        setColorGateConnection={setColorGateConnection}
        colorGateSocketConnection={colorGateSocketConnection}
        colorGatePopupError={colorGatePopupError}
        colorGatePopupTitle={colorGatePopupTitle}
        setColorGatePopupError={setColorGatePopupError}
        socketConnectionInProgress={socketConnectionInProgress}
        setSocketConnectionInProgress={setSocketConnectionInProgress}
        alwanAPILog={alwanAPILog}
        alwanConnection={alwanConnection}
        setAlwanConnection={setAlwanConnection}
        alwanSocketConnection={alwanSocketConnection}
        alwanPopupError={alwanPopupError}
        alwanPopupTitle={alwanPopupTitle}
        setAlwanPopupError={setAlwanPopupError}
        alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
        setAlwanSocketConnectionInProgress={
          setAlwanSocketConnectionInProgress
        }
        balanceDeviceList={balanceDeviceList}
        barcodeDeviceList={barcodeDeviceList}
        zebraDeviceList={zebraDeviceList}
        setisPrecisionShow={setisPrecisionShow}
        setIsBarcodeOnShow={setIsBarcodeOnShow}
        setIsZebraOnShow={setIsZebraOnShow}
        />
      )
  }
  else if(isZebraOnShow){
    return (
      <DeviceZebraPrinter
      username={username}
      deviceList={deviceList}
      licenses={licenses}
      instanceURL={instanceURL}
      token={token}
      onDeviceConnected={handleZebraDeviceConnection}
      onDeviceDisConnect={handleZebraDeviceDisconnect}
      onGoBackToMeasure={goBackToMeasureScreen}
      onLogout={handleLogout}
      onHasDeviceDisconnectTimeout={(res) =>
       setHasDeviceDisconnectTimeout(res)
      }
      lastConnectedZebra={lastConnectedZebra}
      onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
      handleCheckUpdate={handleCheckUpdatePage}
      isNewUpdateAvailable={isNewUpdateAvailable}
      onThirdPartyAPI={handleThirdPartyAPI}
      showThirdPartyAPIPage={showThirdPartyAPIPage}
      colorGateAPILog={colorGateAPILog}
      socketConnection={socketConnection}
      thirdPartyAPIUser={thirdPartyAPIUser}
      colorGateConnection={colorGateConnection}
      setColorGateConnection={setColorGateConnection}
      colorGateSocketConnection={colorGateSocketConnection}
      colorGatePopupError={colorGatePopupError}
      colorGatePopupTitle={colorGatePopupTitle}
      setColorGatePopupError={setColorGatePopupError}
      socketConnectionInProgress={socketConnectionInProgress}
      setSocketConnectionInProgress={setSocketConnectionInProgress}
      alwanAPILog={alwanAPILog}
      alwanConnection={alwanConnection}
      setAlwanConnection={setAlwanConnection}
      alwanSocketConnection={alwanSocketConnection}
      alwanPopupError={alwanPopupError}
      alwanPopupTitle={alwanPopupTitle}
      setAlwanPopupError={setAlwanPopupError}
      alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
      setAlwanSocketConnectionInProgress={
        setAlwanSocketConnectionInProgress
      }
      balanceDeviceList={balanceDeviceList}
      setisPrecisionShow={setisPrecisionShow}
      barcodeDeviceList={barcodeDeviceList}
      setIsBarcodeOnShow={setIsBarcodeOnShow}
      zebraDeviceList={zebraDeviceList}
      setIsZebraOnShow={setIsZebraOnShow}
      />
    )
}
    else if (!lastConnectedDevice) {
      //when no last connected Device found, select device to connect
      return (
        <DeviceSelection
          username={username}
          deviceList={deviceList}
          licenses={licenses}
          instanceURL={instanceURL}
          token={token}
          onDeviceConnected={handleDeviceConnection}
          onDeviceDisConnect={handleDeviceDisconnect}
          onGoBackToMeasure={goBackToMeasureScreen}
          onLogout={handleLogout}
          onHasDeviceDisconnectTimeout={(res) =>
            setHasDeviceDisconnectTimeout(res)
          }
          connectedDevice={deviceChangeFrom}
          onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
          handleCheckUpdate={handleCheckUpdatePage}
          isNewUpdateAvailable={isNewUpdateAvailable}
          onThirdPartyAPI={handleThirdPartyAPI}
          showThirdPartyAPIPage={showThirdPartyAPIPage}
          colorGateAPILog={colorGateAPILog}
          socketConnection={socketConnection}
          thirdPartyAPIUser={thirdPartyAPIUser}
          colorGateConnection={colorGateConnection}
          setColorGateConnection={setColorGateConnection}
          colorGateSocketConnection={colorGateSocketConnection}
          colorGatePopupError={colorGatePopupError}
          colorGatePopupTitle={colorGatePopupTitle}
          setColorGatePopupError={setColorGatePopupError}
          socketConnectionInProgress={socketConnectionInProgress}
          setSocketConnectionInProgress={setSocketConnectionInProgress}
          alwanAPILog={alwanAPILog}
          alwanConnection={alwanConnection}
          setAlwanConnection={setAlwanConnection}
          alwanSocketConnection={alwanSocketConnection}
          alwanPopupError={alwanPopupError}
          alwanPopupTitle={alwanPopupTitle}
          setAlwanPopupError={setAlwanPopupError}
          alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
          setAlwanSocketConnectionInProgress={
            setAlwanSocketConnectionInProgress
          }
          balanceDeviceList={balanceDeviceList}
          setisPrecisionShow={setisPrecisionShow}
          barcodeDeviceList={barcodeDeviceList}
          setIsBarcodeOnShow={setIsBarcodeOnShow}
          zebraDeviceList={zebraDeviceList}
          setIsZebraOnShow={setIsZebraOnShow}
        />
      );
    } else if (lastConnectedDevice) {
      // when lastConnectedDevice info available
      if (
        connectedDeviceList &&
        connectedDeviceList[0] &&
        (connectedDeviceList[0].deviceType == 'I1IO3' ||
          connectedDeviceList[0].deviceType == 'I1IO2')
      ) {
        return (
          <ColorMatch
            username={username}
            instanceURL={instanceURL}
            connectedDevice={lastConnectedDevice}
            deviceList={connectedDeviceList}
            licenses={licenses}
            token={token}
            onLogout={handleLogout}
            onChangeDevice={handleChangeDevice}
            onDeviceDisConnect={handleDeviceDisconnect}
            onSelectOtherDevice={handleSelectOtherDevice}
            onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
            handleCheckUpdate={handleCheckUpdatePage}
            isNewUpdateAvailable={isNewUpdateAvailable}
            onThirdPartyAPI={handleThirdPartyAPI}
            showThirdPartyAPIPage={showThirdPartyAPIPage}
            colorGateAPILog={colorGateAPILog}
            socketConnection={socketConnection}
            thirdPartyAPIUser={thirdPartyAPIUser}
            colorGateConnection={colorGateConnection}
            setColorGateConnection={setColorGateConnection}
            colorGateSocketConnection={colorGateSocketConnection}
            colorGatePopupError={colorGatePopupError}
            colorGatePopupTitle={colorGatePopupTitle}
            setColorGatePopupError={setColorGatePopupError}
            socketConnectionInProgress={socketConnectionInProgress}
            setSocketConnectionInProgress={setSocketConnectionInProgress}
            alwanAPILog={alwanAPILog}
            alwanConnection={alwanConnection}
            setAlwanConnection={setAlwanConnection}
            alwanSocketConnection={alwanSocketConnection}
            alwanPopupError={alwanPopupError}
            alwanPopupTitle={alwanPopupTitle}
            setAlwanPopupError={setAlwanPopupError}
            alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
            setAlwanSocketConnectionInProgress={
              setAlwanSocketConnectionInProgress
            }
            scanRes={scanRes}
            setScanRes={setScanRes}
            currentAction={currentI1IO3Action}
            setCurrentAction={setCurrentI1IO3Action}
          />
        );
      } else {
        return (
          <DeviceMeasurement
            username={username}
            instanceURL={instanceURL}
            connectedDevice={lastConnectedDevice}
            deviceList={connectedDeviceList}
            licenses={licenses}
            token={token}
            onLogout={handleLogout}
            onChangeDevice={handleChangeDevice}
            onDeviceDisConnect={handleDeviceDisconnect}
            onSelectOtherDevice={handleSelectOtherDevice}
            onGetDeviceAndLicenses={handleGetDeviceAndLicenses}
            handleCheckUpdate={handleCheckUpdatePage}
            isNewUpdateAvailable={isNewUpdateAvailable}
            onThirdPartyAPI={handleThirdPartyAPI}
            showThirdPartyAPIPage={showThirdPartyAPIPage}
            colorGateAPILog={colorGateAPILog}
            socketConnection={socketConnection}
            thirdPartyAPIUser={thirdPartyAPIUser}
            colorGateConnection={colorGateConnection}
            setColorGateConnection={setColorGateConnection}
            colorGateSocketConnection={colorGateSocketConnection}
            colorGatePopupError={colorGatePopupError}
            colorGatePopupTitle={colorGatePopupTitle}
            setColorGatePopupError={setColorGatePopupError}
            socketConnectionInProgress={socketConnectionInProgress}
            setSocketConnectionInProgress={setSocketConnectionInProgress}
            alwanAPILog={alwanAPILog}
            alwanConnection={alwanConnection}
            setAlwanConnection={setAlwanConnection}
            alwanSocketConnection={alwanSocketConnection}
            alwanPopupError={alwanPopupError}
            alwanPopupTitle={alwanPopupTitle}
            setAlwanPopupError={setAlwanPopupError}
            alwanSocketConnectionInProgress={alwanSocketConnectionInProgress}
            setAlwanSocketConnectionInProgress={
              setAlwanSocketConnectionInProgress
            }
            balanceDeviceList={balanceDeviceList}
            setisPrecisionShow={setisPrecisionShow}
            barcodeDeviceList={barcodeDeviceList}
            setIsBarcodeOnShow={setIsBarcodeOnShow}
            zebraDeviceList={zebraDeviceList}
            setIsZebraOnShow={setIsZebraOnShow}
          />
        );
      }
    } else {
      return <NewConnection />;
    }
  };

  return (
    <InstanceConnectionProvider>
    {renderView()}
    </InstanceConnectionProvider>

  );
}
