/* eslint-disable react/button-has-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import DevicePageTitle from 'renderer/components/DeviceHeader';
import DeviceLicense from 'renderer/components/DeviceLicense';
import ConnectModal from 'renderer/components/ConnectModal';
import Pagination from 'renderer/components/Pagination';
import DisConnectModal from 'renderer/components/DisConnectModal';
import PopupModal from 'renderer/components/PopupModal';
import HomeFooter from 'renderer/components/HomeFooter';
import ZebraDeviceList from 'renderer/components/ZebraDeviceList';
import {
  CLOSE_PB_DEVICE,
  DEVICE_DISCONNECT_TIMEOUT,
  GET_DEVICE_AND_LICENSES,
  GET_DEVICE_INSTANCE_URL,
  DEVICE_DISCONNECTION,
  VERIFY_DEVICE_CONNECTION,
  DISCONNECT_DEVICE,
  DEVICE_DISCONNECT_API_CALL,
  DEVICE_CONNECTION,
  CHECK_ZEBRA_DEVICE_CONNECTION,
  CURRENT_TAB_UPDATE,
} from 'utility/constants';
import Timeline from '../components/Timeline';
import ThirdPartyAPI from '../components/ThirdPartyAPI';

const { ipcRenderer } = window.require('electron');

function DeviceZebraPrinter({
  username,
  deviceList,
  licenses,
  instanceURL,
  token,
  onGetDeviceAndLicenses,
  onDeviceDisConnect,
  onDeviceConnected,
  onGoBackToMeasure,
  onLogout,
  lastConnectedZebra,
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
  setIsBarcodeOnShow,
  barcodeDeviceList,
  balanceDeviceList,
  setisPrecisionShow,
  zebraDeviceList,
  setIsZebraOnShow,
}) {
  const [connectModal, setConnectModal] = useState(false);
  const [disconnectModal, setDisconnectModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(2);
  const [currentZebraeDevice, setCurrentZebraeDevice] = useState();
  const [zebraDeviceType, setZebraDeviceType] = useState('');
  const [error, setError] = useState('');
  const [currentDevice, setCurrentDevice] = useState(lastConnectedZebra);
  const [deviceConnectionInterval, setDeviceConnectionInterval] =
    useState(null);
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState(false);

  const startCheckDeviceConnectionInterval = (device) => {
    setDeviceConnectionInterval((prevInterval) => {
      if (prevInterval) clearInterval(prevInterval);
      return setInterval(() => {
        if (
          !['I1IO3', 'I1IO2', 'CI62_COLORSCOUT', 'CI64_COLORSCOUT'].includes(
            device.deviceType,
          )
        ) {
          ipcRenderer.send(CHECK_ZEBRA_DEVICE_CONNECTION, device);
        }
      }, 3000);
    });
  };

  const stopCheckDeviceConnectionInterval = () => {
    setDeviceConnectionInterval((prevInterval) => {
      if (prevInterval) clearInterval(prevInterval);
      return null;
    });
  };

  const handleRefresh = () => {
    ipcRenderer.send(GET_DEVICE_AND_LICENSES, { instanceURL, username, token });
  };

  const onDisconnectCurrentZebraeDevice = (deviceId) => {
    const device = zebraDeviceList.find((dev) => dev.deviceId === deviceId);
    stopCheckDeviceConnectionInterval();
    ipcRenderer.send(CLOSE_PB_DEVICE, {
      forceClose: true,
      deviceType: device?.deviceType,
      deviceId,
    });
    handleRefresh();
  };

  const onCheckDeviceConnection = (event, args) => {
    if (args.status) {
      setDeviceConnectionStatus(false);
    } else {
      onDisconnectCurrentZebraeDevice(args.deviceId);
      setDisconnectModal(true);
      setCurrentPage(3);
      stopCheckDeviceConnectionInterval();
    }
  };

  const onDeviceAndLicensesRes = (event, args) => onGetDeviceAndLicenses(args);

  const onDeviceRelease = (event, args) => {
    if (args) {
      setTimeout(handleRefresh, 3000);
    }
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

  const onCloseDevice = (event, args) => {
    if (args.res) {
      onDeviceDisConnect(args.deviceId);
    } else {
      setError(args.error || 'Device Disconnected!!');
    }
  };

  const onDeviceDisconnectTimeout = (event, args) => {
    if (args && currentZebraeDevice) {
      stopCheckDeviceConnectionInterval();
      onDisconnectCurrentZebraeDevice(currentZebraeDevice);
    }
  };

  const onConnectZebraDevice = (deviceId) => {
    const device = zebraDeviceList.find((dev) => dev.deviceId === deviceId);
    setCurrentZebraeDevice(deviceId);
    setZebraDeviceType(device?.deviceType);
    if (device) {
      ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  const onGetDeviceInstanceLink = (event, args) => {
    if (args.res) {
      window.open(args.url);
    } else {
      setError(args.error);
    }
  };
  const onDeviceConnection = (event, args) => {
    // if device connected successfully from equipment app then refresh device list and licenses
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };
  useEffect(() => {
    const ipcEvents = [
      { event: VERIFY_DEVICE_CONNECTION, handler: onVerifyDeviceConnection },
      { event: CLOSE_PB_DEVICE, handler: onCloseDevice },
      { event: DEVICE_DISCONNECT_TIMEOUT, handler: onDeviceDisconnectTimeout },
      { event: GET_DEVICE_AND_LICENSES, handler: onDeviceAndLicensesRes },
      { event: GET_DEVICE_INSTANCE_URL, handler: onGetDeviceInstanceLink },
      { event: DEVICE_CONNECTION, handler: onDeviceConnection },
      { event: DEVICE_DISCONNECTION, handler: onDeviceRelease },
      {
        event: CHECK_ZEBRA_DEVICE_CONNECTION,
        handler: onCheckDeviceConnection,
      },
    ];

    ipcEvents.forEach(({ event, handler }) => ipcRenderer.on(event, handler));

    handleRefresh();

    return () => {
      ipcEvents.forEach(({ event, handler }) =>
        ipcRenderer.removeListener(event, handler),
      );
      stopCheckDeviceConnectionInterval();
    };
  }, []);

  useEffect(() => {
    if (zebraDeviceList.length && lastConnectedZebra) {
      const device = zebraDeviceList.find(
        (x) => x.deviceId === lastConnectedZebra,
      );
      if (device) startCheckDeviceConnectionInterval(device);
    }
  }, [zebraDeviceList, lastConnectedZebra]);

  const openLinkInBrowser = async () => {
    ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const handleGotoInstance = async (checked) => {
    await openLinkInBrowser();
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    onDeviceConnected(currentZebraeDevice);
  };

  const handleNext = (checked) => {
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    if (currentDevice) {
      onDeviceConnected(currentDevice);
    } else {
      onDeviceConnected(currentZebraeDevice);
    }
  };

  const handleRetry = () => {
    const device = zebraDeviceList.find(
      (x) => x.deviceId === currentZebraeDevice,
    );
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
    setDeviceConnectionStatus(false);
  };

  const handleBack = () => {
    setCurrentPage(2);
    setDisconnectModal(false);
    setDeviceConnectionStatus(false);
  };

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
              {/* <h3 className="page-title">Device & licence overview</h3>
              <DeviceLicense licenses={licenses} /> */}
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
              <ZebraDeviceList
                zebraDeviceList={zebraDeviceList}
                onConnectZebraDevice={onConnectZebraDevice}
                onDisconnectcurrentZebraeDevice={
                  onDisconnectCurrentZebraeDevice
                }
                onGoBackToMeasure={onGoBackToMeasure}
                lastConnectedZebra={lastConnectedZebra}
                instanceURL={instanceURL}
              />
              <Pagination currentStep={currentPage} />
              <HomeFooter />
              {connectModal && (
                <ConnectModal
                  onConfirm={handleGotoInstance}
                  onCancel={handleNext}
                />
              )}
              {deviceConnectionStatus && (
                <PopupModal
                  isSuccess={false}
                  title="Device Disconnected !!"
                  message="Please verify the device connection or select another device !!"
                  onConfirm={handleRetry}
                  confirmBtnText="Reconnect"
                  onCancel={handleBack}
                  cancelBtnText="Select Device"
                />
              )}
              {disconnectModal && (
                <DisConnectModal
                  onConfirm={handleRetry}
                  onCancel={handleBack}
                  deviceType={zebraDeviceType}
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

export default DeviceZebraPrinter;
