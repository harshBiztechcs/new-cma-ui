/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
/* eslint-disable react/button-has-type */
import React, { useEffect, useState } from 'react';
import DevicePageTitle from 'renderer/components/DeviceHeader';
import Pagination from 'renderer/components/Pagination';
import Timeline from 'renderer/components/Timeline';
import ConnectModal from 'renderer/components/ConnectModal';
import DisConnectModal from 'renderer/components/DisConnectModal';
import PopupModal from 'renderer/components/PopupModal';
import ThirdPartyAPI from 'renderer/components/ThirdPartyAPI';
import HomeFooter from 'renderer/components/HomeFooter';
import BarcodeDeviceList from 'renderer/components/BarcodeDeviceList';

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
  CHECK_BARCODE_DEVICE_CONNECTION,
  CURRENT_TAB_UPDATE,
} from 'utility/constants';

const { ipcRenderer } = window.require('electron');

function DeviceBarcode({
  username,
  instanceURL,
  token,
  onGetDeviceAndLicenses,
  onDeviceDisConnect,
  onDeviceConnected,
  onGoBackToMeasure,
  onLogout,
  lastConnectedBarcode,
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
  const [currentBarcodeDevice, setCurrentBarcodeDevice] = useState();
  const [barcodeDeviceType, setBarcodeDeviceType] = useState('');
  const [error, setError] = useState('');
  const [currentDevice, setCurrentDevice] = useState(lastConnectedBarcode);
  const [deviceConnectionInterval, setDeviceConnectionInterval] = useState(0);
  const [deviceConnectionStatus, setDeviceConnectionStatus] = useState(false);

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
  const onCloseDevice = (event, args) => {
    if (args.res) {
      onDeviceDisConnect(args.deviceId);
    } else {
      setError(args.error ?? 'Device Disconnected!!');
    }
  };

  const stopCheckDeviceConnectionInterval = () => {
    setDeviceConnectionInterval((interval) => {
      if (interval) {
        clearInterval(interval);
        return 0;
      }
      return 0;
    });
  };

  const onDeviceDisconnectTimeout = (event, args) => {
    if (args && currentBarcodeDevice) {
      stopCheckDeviceConnectionInterval();
    }
  };

  const onDisconnectCurrentBarcodeDevice = (deviceId) => {
    const device = barcodeDeviceList.find((dev) => dev.deviceId === deviceId);
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
      onDisconnectCurrentBarcodeDevice(args.deviceId);
      setDisconnectModal(true);
      setCurrentPage(3);
      stopCheckDeviceConnectionInterval();
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

  const onGetDeviceInstanceLink = (event, args) => {
    if (args.res) {
      window.open(args.url);
    } else {
      setError(args.error);
    }
  };

  const onDeviceRelease = (event, args) => {
    if (args) {
      setTimeout(() => {
        handleRefresh();
      }, 3000);
    }
  };

  const startCheckDeviceConnectionInterval = (device) => {
    setDeviceConnectionInterval((prevInterval) => {
      if (prevInterval) clearInterval(prevInterval);
      return setInterval(() => {
        if (
          !['I1IO3', 'I1IO2', 'CI62_COLORSCOUT', 'CI64_COLORSCOUT'].includes(
            device.deviceType,
          )
        ) {
          ipcRenderer.send(CHECK_BARCODE_DEVICE_CONNECTION, device);
        }
      }, 3000);
    });
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
        event: CHECK_BARCODE_DEVICE_CONNECTION,
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
    if (barcodeDeviceList.length && lastConnectedBarcode) {
      const device = barcodeDeviceList.find(
        (x) => x.deviceId === lastConnectedBarcode,
      );
      if (device) startCheckDeviceConnectionInterval(device);
    }
  }, [barcodeDeviceList, lastConnectedBarcode]);

  const onConnectBarcodeDevice = (deviceId) => {
    const device = barcodeDeviceList.find((dev) => dev.deviceId === deviceId);
    setCurrentBarcodeDevice(deviceId);
    setBarcodeDeviceType(device?.deviceType);
    if (device) {
      ipcRenderer.send(VERIFY_DEVICE_CONNECTION, device);
    }
  };

  const openLinkInBrowser = async () => {
    ipcRenderer.send(GET_DEVICE_INSTANCE_URL, instanceURL);
  };

  const handleGotoInstance = async (checked) => {
    await openLinkInBrowser();
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    onDeviceConnected(currentBarcodeDevice);
  };

  const handleNext = (checked) => {
    onHasDeviceDisconnectTimeout(checked);
    setConnectModal(false);
    if (currentDevice) {
      onDeviceConnected(currentDevice);
    } else {
      onDeviceConnected(currentBarcodeDevice);
    }
  };

  const handleRetry = () => {
    const device = barcodeDeviceList.find(
      (x) => x.deviceId === currentBarcodeDevice,
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
              <BarcodeDeviceList
                barcodeDeviceList={barcodeDeviceList}
                onConnectBarcodeDevice={onConnectBarcodeDevice}
                onDisconnectCurrentBarcodeDevice={
                  onDisconnectCurrentBarcodeDevice
                }
                onGoBackToMeasure={onGoBackToMeasure}
                lastConnectedBarcode={lastConnectedBarcode}
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
                  deviceType={barcodeDeviceType}
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

export default DeviceBarcode;
