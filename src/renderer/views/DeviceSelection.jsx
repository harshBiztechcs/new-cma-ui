/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/button-has-type */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import DevicePageTitle from 'renderer/components/DeviceHeader';
import Pagination from 'renderer/components/Pagination';
import Timeline from 'renderer/components/Timeline';
import ConnectModal from 'renderer/components/ConnectModal';
import DisConnectModal from 'renderer/components/DisConnectModal';
import DeviceList from 'renderer/components/DeviceList';
import PopupModal from 'renderer/components/PopupModal';
import ThirdPartyAPI from 'renderer/components/ThirdPartyAPI';
import HomeFooter from 'renderer/components/HomeFooter';
import DeviceScanModal from 'renderer/components/DeviceScanModal';

import {
  CLOSE_DEVICE,
  DEVICE_DISCONNECT_TIMEOUT,
  GET_DEVICE_AND_LICENSES,
  GET_DEVICE_INSTANCE_URL,
  DEVICE_DISCONNECTION,
  VERIFY_DEVICE_CONNECTION,
  DISCONNECT_DEVICE,
  DEVICE_DISCONNECT_API_CALL,
  DEVICE_CONNECTION,
  CURRENT_TAB_UPDATE,
  GET_MAC_ADDRESS,
  SWITCH_TO_YS3060_CONNECTION_MODE,
  CHECK_ROP_DEVICE_CONNECTION,
} from 'utility/constants';

const { ipcRenderer } = window.require('electron');

function DeviceSelection({
  username,
  deviceList,
  instanceURL,
  token,
  onGetDeviceAndLicenses,
  onDeviceDisConnect,
  onDeviceConnected,
  onGoBackToMeasure,
  onLogout,
  connectedDevice,
  onHasDeviceDisconnectTimeout,
  handleCheckUpdate,
  isNewUpdateAvailable,
  onThirdPartyAPI,
  showThirdPartyAPIPage,
  colorGateAPILog,
  socketConnection,
  thirdPartyAPIUser,
  colorGateConnection,
  setColorGateConnection,
  colorGateSocketConnection,
  colorGatePopupError,
  colorGatePopupTitle,
  setColorGatePopupError,
  socketConnectionInProgress,
  setSocketConnectionInProgress,
  alwanAPILog,
  alwanConnection,
  setAlwanConnection,
  alwanSocketConnection,
  alwanPopupError,
  alwanPopupTitle,
  setAlwanPopupError,
  alwanSocketConnectionInProgress,
  setAlwanSocketConnectionInProgress,
  setisPrecisionShow,
  balanceDeviceList,
  barcodeDeviceList,
  setIsBarcodeOnShow,
  zebraDeviceList,
  setIsZebraOnShow,
}) {
  const [connectModal, setConnectModal] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(2);
  const [currentDevice, setCurrentDevice] = useState();
  const [deviceType, setDeviceType] = useState('');
  const [error, setError] = useState('');
  const [scanDeviceListModal, setScanDeviceListModal] = useState(false);
  const [deviceAddress, setDeviceAddress] = useState(null);
  const [isConnectedWithBT, setIsConnectedWithBT] = useState(false);

  const handleRefresh = () => {
    ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  const onVerifyDeviceConnection = (event, args) => {
    if (args) {
      setConnectModal(true);
      setCurrentPage(3);
    } else {
      setDisconnectModal(true);
      setCurrentPage(3);
    }
  };

  const onCheckDeviceConnection = (event, args) => {
    if (args) {
      setScanDeviceListModal(true);
      setCurrentPage(3);
    } else {
      setDisconnectModal(true);
      setCurrentPage(3);
    }
  };

  const onCloseDevice = (event, args) => {
    if (args.res) {
      // TODO : send release license call to main after device close
      onDeviceDisConnect(connectedDevice);
    } else {
      setError(args.error ?? 'Device Disconnection Failed !!');
    }
  };

  const onDisconnectCurrentDevice = (deviceId) => {
    const device = deviceList.find((dev) => dev.deviceId === deviceId);

    ipcRenderer.send(CLOSE_DEVICE, {
      forceClose: true,
      deviceType: device?.deviceType,
      deviceId,
      instanceURL,
    });
    handleRefresh();
  };

  const onDeviceDisconnectTimeout = (event, args) => {
    if (args && connectedDevice) {
      onDisconnectCurrentDevice(connectedDevice);
    }
  };
  const onDeviceAndLicensesRes = (event, args) => {
    onGetDeviceAndLicenses(args);
  };

  const onDeviceConnection = (event, args) => {
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const onDeviceRelease = (event, args) => {
    // if device disconnected from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const onGetDeviceInstanceLink = (event, args) => {
    if (args.res) {
      window.open(args.url);
    } else {
      setError(args.error);
    }
  };

  useEffect(() => {
    const ipcEvents = [
      { event: VERIFY_DEVICE_CONNECTION, handler: onVerifyDeviceConnection },
      { event: CHECK_ROP_DEVICE_CONNECTION, handler: onCheckDeviceConnection },
      { event: CLOSE_DEVICE, handler: onCloseDevice },
      { event: DEVICE_DISCONNECT_TIMEOUT, handler: onDeviceDisconnectTimeout },
      { event: GET_DEVICE_AND_LICENSES, handler: onDeviceAndLicensesRes },
      { event: GET_DEVICE_INSTANCE_URL, handler: onGetDeviceInstanceLink },
      { event: DEVICE_CONNECTION, handler: onDeviceConnection },
      { event: DEVICE_DISCONNECTION, handler: onDeviceRelease },
    ];

    ipcEvents.forEach(({ event, handler }) => ipcRenderer.on(event, handler));
    handleRefresh();

    return () => {
      ipcEvents.forEach(({ event, handler }) =>
        ipcRenderer.removeListener(event, handler),
      );
    };
  }, []);

  useEffect(() => {
    ipcRenderer.send(GET_MAC_ADDRESS, deviceAddress);
  }, [deviceAddress]);

  const connectionMode = async (args) => {
    ipcRenderer.send(SWITCH_TO_YS3060_CONNECTION_MODE, { args, instanceURL });
  };

  const onConnect = async (deviceId) => {
    await connectionMode(false);
    const device = deviceList.find((dev) => dev.deviceId === deviceId);
    setCurrentDevice(deviceId);
    setIsConnectedWithBT(false);
    await connectionMode(false);
    setDeviceType(device?.deviceType);
    if (device) {
      ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  const openLinkInBrowser = async () => {
    ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const handleGotoInstance = async (checked) => {
    await openLinkInBrowser();
    // device disconnection timeout checked
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    onDeviceConnected(currentDevice);
  };

  const handleNext = (checked) => {
    // device disconnection timeout checked
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    onDeviceConnected(currentDevice);
  };

  const handleRetry = () => {
    const device = deviceList.find((x) => x.deviceId === currentDevice);
    if (
      device &&
      (device.deviceType === 'I1IO3' || device.deviceType === 'I1IO2')
    ) {
      ipcRenderer.send(DISCONNECT_DEVICE, device);
      ipcRenderer.send(DEVICE_DISCONNECT_API_CALL, {
        instanceURL,
        deviceName: device?.deviceType,
        deviceId: device?.deviceId,
      });
    }
    ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    setDisconnectModal(false);
  };

  const handleBack = () => {
    setCurrentPage(2);
    setDisconnectModal(false);
    setScanDeviceListModal(false);
  };

  const handleSelectDevice = (address) => {
    setDeviceAddress(address);
    setScanDeviceListModal(false);
    const device = deviceList.find((dev) => dev.deviceId === currentDevice);

    if (device) {
      ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  function onBluetoothConnection(deviceId) {
    const device = deviceList.find((dev) => dev.deviceId === deviceId);
    setCurrentDevice(deviceId);
    setDeviceType(device?.deviceType);
    setIsConnectedWithBT(true);
    connectionMode(true);
    if (device) {
      ipcRenderer.send(CHECK_ROP_DEVICE_CONNECTION, 'CMA-ROP64E-UV-BT');
    }
  }
  const SpectroDeviceButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 1);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };
  const precisionBalanceButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 2);
    setisPrecisionShow(true);
    setIsBarcodeOnShow(false);
    setIsZebraOnShow(false);
  };
  const barcodeScannerButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 3);
    setIsBarcodeOnShow(true);
    setisPrecisionShow(false);
    setIsZebraOnShow(false);
  };
  const zebraPrinterButton = () => {
    ipcRenderer.send(CURRENT_TAB_UPDATE, 4);
    setIsZebraOnShow(true);
    setisPrecisionShow(false);
    setIsBarcodeOnShow(false);
  };

  return (
    <div id="main" className="cma-connect-page">
      <div className="container-fluid">
        <div className="d-flex flex-wrap h-100">
          <Timeline
            currentStep={currentPage}
            handleCheckUpdate={handleCheckUpdate}
            isNewUpdateAvailable={isNewUpdateAvailable}
          />
          {!showThirdPartyAPIPage && (
            <div className="right-side">
              <DevicePageTitle
                title="Select the device to connect"
                subtitle="List of licensed devices"
                onLogout={onLogout}
                onRefresh={handleRefresh}
                onThirdPartyAPI={thirdPartyAPIUser ? onThirdPartyAPI : null}
                username={username}
                instanceURL={instanceURL}
              />
              <div className="d-flex mb-10">
                <button
                  className="btn-secondary mr-12"
                  onClick={SpectroDeviceButton}
                >
                  Spectro Device
                </button>
                {balanceDeviceList.length > 0 && (
                  <button
                    className="btn-secondary mr-12"
                    onClick={precisionBalanceButton}
                  >
                    Precision Balance
                  </button>
                )}
                {barcodeDeviceList.length > 0 && (
                  <button
                    className="btn-secondary mr-12"
                    onClick={barcodeScannerButton}
                  >
                    Barcode Scanner
                  </button>
                )}
                {zebraDeviceList.length > 0 && (
                  <button
                    className="btn-secondary mr-12"
                    onClick={zebraPrinterButton}
                  >
                    Label Printer
                  </button>
                )}
              </div>

              <DeviceList
                deviceList={deviceList}
                onConnect={onConnect}
                onDisconnect={onDisconnectCurrentDevice}
                onGoBackToMeasure={onGoBackToMeasure}
                connectedDevice={connectedDevice}
                onBluetoothConnection={onBluetoothConnection}
              />
              <Pagination currentStep={currentPage} />
              <HomeFooter />
              {connectModal && (
                <ConnectModal
                  onConfirm={handleGotoInstance}
                  onCancel={handleNext}
                />
              )}
              {disconnectModal && (
                <DisConnectModal
                  onConfirm={handleRetry}
                  onCancel={handleBack}
                  deviceType={deviceType}
                />
              )}
              {error && (
                <PopupModal
                  isSuccess={false}
                  title="Error"
                  message={error}
                  onConfirm={() => setError('')}
                  confirmBtnText="OK"
                />
              )}
              {colorGatePopupError && (
                <PopupModal
                  isSuccess={false}
                  title="Error"
                  message={colorGatePopupError}
                  onConfirm={() => setColorGatePopupError('')}
                  confirmBtnText="OK"
                />
              )}
              {scanDeviceListModal && (
                <DeviceScanModal
                  onConfirm={handleSelectDevice}
                  onCancel={handleBack}
                  setDisconnectModal={setDisconnectModal}
                  disconnectModal={disconnectModal}
                />
              )}
            </div>
          )}
          {showThirdPartyAPIPage && (
            <ThirdPartyAPI
              onLogout={onLogout}
              username={username}
              instanceURL={instanceURL}
              handleRefresh={handleRefresh}
              onThirdPartyAPI={onThirdPartyAPI}
              colorGateAPILog={colorGateAPILog}
              socketConnection={socketConnection}
              colorGateConnection={colorGateConnection}
              setColorGateConnection={setColorGateConnection}
              colorGateSocketConnection={colorGateSocketConnection}
              colorGatePopupTitle={colorGatePopupTitle}
              colorGatePopupError={colorGatePopupError}
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
              currentPage={currentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DeviceSelection;
