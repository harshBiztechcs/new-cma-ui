/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useState } from 'react';
import Pagination from 'renderer/components/Pagination';
import Timeline from 'renderer/components/Timeline';
import {
  CONNECTION_STATUS,
  CONNECT_SOCKET,
  GET_DEVICE_AND_LICENSES,
  SOCKET_CONNECTION,
  VERIFY_DEVICE_CONNECTION,
  VERIFY_PB_DEVICE_CONNECTION,
} from 'utility/constants';
import HomeFooter from 'renderer/components/HomeFooter';
import cmaConnectIcon from '../assets/image/cma-connect-icon.png';

const { ipcRenderer } = window.electron;

function ServerConnection({
  onServerConnection,
  username,
  instanceURL,
  socketURL,
  token,
  lastDevice,
  onDeviceConnection,
  onDeviceDisconnect,
  serverError,
  onLogout,
  onGetDeviceAndLicenses,
  handleCheckUpdate,
  isNewUpdateAvailable,
  connectedPBDevice,
  onDevicePBConnection,
  onPBDeviceReConnect,
  onPBDeviceDisconnect,
  lastConnectedBarcode,
  lastConnectedZebra,
  onDeviceBarcodeConnection,
  onDeviceZebraConnection,
  onZebraDeviceReConnect,
  onBarcodeDeviceReConnect,
  onBarcodeDeviceDisconnect,
  onZebraDeviceDisconnect,
}) {
  const [error, setError] = useState(serverError);
  const [deviceList, setDeviceList] = useState([]);
  const [pbDeviceList, setPBDeviceList] = useState([]);
  const [barcodeDeviceList, setBarcodeDeviceList] = useState([]);
  const [zebraDeviceList, setZebraDeviceList] = useState([]);

  const updateDeviceList = (devices) => {
    if (devices) {
      const newDeviceList = [];
      const newBalanceDeviceList = [];
      const newBarcodeDeviceList = [];
      const newZebraDeviceList = [];

      Object.entries(devices).forEach(([deviceId, device]) => {
        if (device.is_precision_balance) {
          newBalanceDeviceList.push({ ...device, deviceId });
        } else if (device.deviceType === 'barcode_reader') {
          newBarcodeDeviceList.push({ ...device, deviceId });
        } else if (device.deviceType === 'label_printer') {
          newZebraDeviceList.push({ ...device, deviceId });
        } else {
          newDeviceList.push({ ...device, deviceId });
        }
      });

      setDeviceList(newDeviceList);
      setPBDeviceList(newBalanceDeviceList);
      setBarcodeDeviceList(newBarcodeDeviceList);
      setZebraDeviceList(newZebraDeviceList);
    }
  };

  const onDeviceAndLicensesRes = (args) => {
    onGetDeviceAndLicenses(args);
    updateDeviceList(args?.deviceRes?.devices ?? []);

    if (!serverError) {
      // ipcRenderer.send(CONNECT_SOCKET, {
      //   username,
      //   instanceURL,
      //   token,
      //   socketURL,
      // });
    }
  };

  const onConnectionStatus = (args) => {
    if (args === 'connected') {
      // Perform actions when connected
      console.log('Connected to the server');
    } else {
      setError('Server Connection Failed !!');
    }
  };

  const onVerifyDeviceConnection = (args) => {
    if (args) {
      onServerConnection();
      onDeviceConnection(lastDevice);
    } else {
      onServerConnection();
      onDeviceDisconnect();
    }
  };

  const onVerifyPBDeviceConnection = (args) => {
    if (args) {
      onServerConnection();
      onDevicePBConnection(connectedPBDevice);
      onDeviceBarcodeConnection(lastConnectedBarcode);
      onDeviceZebraConnection(lastConnectedZebra);
    } else {
      onServerConnection();
      onPBDeviceDisconnect();
    }
  };

  const onRetryConnection = () => {
    ipcRenderer.send(CONNECT_SOCKET, {
      username,
      instanceURL,
      token,
      socketURL,
    });
  };
  const onSocketConnection = (args) => {
    if (args) {
      onServerConnection();
      // if (lastDevice) {
      //   onDeviceReConnect(lastDevice);
      //   setDeviceList((currentDeviceList) => {
      //     const updatedDeviceList = [...currentDeviceList];

      //     const lastDeviceInfo = updatedDeviceList.find(
      //       (x) => x.deviceId == lastDevice && x.status == 'available'
      //     );

      //     if (lastDeviceInfo) {
      //       ipcRenderer.send(VERIFY_DEVICE_CONNECTION, lastDeviceInfo);
      //     } else {
      //       onServerConnection();
      //     }
      //     return [];
      //   });
      // } else {
      //   onServerConnection();
      // }

      if (connectedPBDevice) {
        onPBDeviceReConnect(connectedPBDevice);
        setPBDeviceList((currentPBDeviceList) => {
          const updatedPBDeviceList = [...currentPBDeviceList];

          const lastPBDeviceInfo = updatedPBDeviceList.find(
            (x) => x.deviceId === connectedPBDevice && x.status === 'available',
          );

          if (lastPBDeviceInfo) {
            ipcRenderer.send(VERIFY_PB_DEVICE_CONNECTION, lastPBDeviceInfo);
          } else {
            onServerConnection();
          }
          return [];
        });
      }

      if (lastConnectedBarcode) {
        onBarcodeDeviceReConnect(lastConnectedBarcode);
        setBarcodeDeviceList((currentBarcodeDeviceList) => {
          const updatedBarcodeDeviceList = [...currentBarcodeDeviceList];

          const lastBarcodeDeviceInfo = updatedBarcodeDeviceList.find(
            (x) =>
              x.deviceId === lastConnectedBarcode && x.status === 'available',
          );

          if (lastBarcodeDeviceInfo) {
            ipcRenderer.send(
              VERIFY_PB_DEVICE_CONNECTION,
              lastBarcodeDeviceInfo,
            );
          } else {
            onServerConnection();
          }
          return [];
        });
      }

      if (lastConnectedZebra) {
        onZebraDeviceReConnect(lastConnectedZebra);
        setZebraDeviceList((currentBarcodeDeviceList) => {
          const updatedZerbaDeviceList = [...currentBarcodeDeviceList];

          const lastZebraDeviceInfo = updatedZerbaDeviceList.find(
            (x) =>
              x.deviceId === lastConnectedZebra && x.status === 'available',
          );

          if (lastZebraDeviceInfo) {
            ipcRenderer.send(VERIFY_PB_DEVICE_CONNECTION, lastZebraDeviceInfo);
          } else {
            onServerConnection();
          }
          return [];
        });
      }
    }
  };

  const getDevicesAndLicenses = () => {
    ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  useEffect(() => {
    ipcRenderer.on(GET_DEVICE_AND_LICENSES, onDeviceAndLicensesRes);
    ipcRenderer.on(CONNECTION_STATUS, onConnectionStatus);
    ipcRenderer.on(VERIFY_DEVICE_CONNECTION, onVerifyDeviceConnection);
    ipcRenderer.on(VERIFY_PB_DEVICE_CONNECTION, onVerifyPBDeviceConnection);
    ipcRenderer.on(SOCKET_CONNECTION, onSocketConnection);

    // get device list and licenses
    getDevicesAndLicenses();

    return () => {
      ipcRenderer.removeListener(CONNECTION_STATUS, onConnectionStatus);
      ipcRenderer.removeListener(
        VERIFY_DEVICE_CONNECTION,
        onVerifyDeviceConnection,
      );
      ipcRenderer.removeListener(
        VERIFY_PB_DEVICE_CONNECTION,
        onVerifyPBDeviceConnection,
      );
      ipcRenderer.removeListener(SOCKET_CONNECTION, onSocketConnection);
      ipcRenderer.removeListener(
        GET_DEVICE_AND_LICENSES,
        onDeviceAndLicensesRes,
      );
    };
  }, []);

  const onForceDisconnect = async () => {
    await onDeviceDisconnect();
    await onBarcodeDeviceDisconnect();
    await onZebraDeviceDisconnect();
    await onPBDeviceDisconnect();
    ipcRenderer.send(CONNECT_SOCKET, {
      username,
      instanceURL,
      token,
      socketURL,
      forceConnect: true,
    });
  };

  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline
            currentStep={1}
            handleCheckUpdate={handleCheckUpdate}
            isNewUpdateAvailable={isNewUpdateAvailable}
          />
          <div className="right-side">
            <div className="center-section">
              <div className="server-connection-screen">
                <img src={cmaConnectIcon} alt="CMA Connect Icon" />
                {!error && (
                  <span>Please wait while retrieving your licences</span>
                )}
                {error && (
                  <div>
                    <span style={{ marginTop: '20px' }}>{error}</span>

                    <div style={{ margin: '20px' }}>
                      {error ===
                      'CMA Connect User ID is currently open in another session. Please try again after logging out from the other session.' ? (
                        <button
                          type="button"
                          className="btn-secondary  mr-12"
                          onClick={onForceDisconnect}
                        >
                          Force Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary  mr-12"
                          onClick={onRetryConnection}
                        >
                          Retry
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary  mr-12"
                        onClick={onLogout}
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Pagination currentStep={1} />
            <HomeFooter />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServerConnection;
