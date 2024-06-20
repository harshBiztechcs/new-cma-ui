import React, { useEffect, useState } from 'react';
import BluetoothConnectSVG from '../assets/image/Bluetooth-connect.svg';
import { BLUETOOTH_SCAN_DEVICE } from 'utility/constants';


function DeviceScanModal({
  onConfirm,
  onCancel,
  setDisconnectModal,
  disconnectModal,
}) {
  const [selectedOption, setSelectedOption] = useState('');
  const [scannedDeviceList, setScannedDeviceList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNextButton, setShowNextButton] = useState(false);

  useEffect(() => {
    window.electron.ipcRenderer.on(BLUETOOTH_SCAN_DEVICE, onDeviceListReceived);
    scanBluetoothDevice();
    return () => {
      window.electron.ipcRenderer.removeListener(BLUETOOTH_SCAN_DEVICE, onDeviceListReceived);
    };
  }, []);

  const onDeviceListReceived = (args) => {
    setIsLoading(false);
    if (args.res) {
      setScannedDeviceList(args.data);
    } else {
      setDisconnectModal(false);
      setScannedDeviceList([]);
    }
  };

  const scanBluetoothDevice = async () => {
    setIsLoading(true);
    window.electron.ipcRenderer.send(BLUETOOTH_SCAN_DEVICE);
  };

  const handleOptionChange = (e) => {
    const selectedValue = e.target.value;
    setSelectedOption(selectedValue);
    setShowNextButton(selectedValue !== '');
  };
  const handleNextButtonClick = () => {
    onConfirm(selectedOption);
  };
  const handleRefreshDevice = () => {
    scanBluetoothDevice();
  };

  return (
    <div id="deviceScanModal" className="modal">
      <div className="modal-content">
        <span className="close">X</span>
        <img src={BluetoothConnectSVG} alt="Connect"></img>
        <h4>Select Device</h4>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="row">
            <div className="form-group">
              {scannedDeviceList.map((device, index) => (
                <div key={`${device.Index}-${device.Address}`}>
                  <input
                    type="radio"
                    id={`deviceOption${device.Index}`}
                    name="device"
                    value={device.Address}
                    checked={selectedOption === device.Address}
                    onChange={handleOptionChange}
                  />
                  <label htmlFor={`deviceOption${device.Index}`}>
                    {device.Name} - {device.Address}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="row mt-28">
          <div className="col-md-6 pr-6">
            <button className="btn-primary" onClick={onCancel}>
              Close
            </button>
          </div>
          {showNextButton ? (
            <div className="col-md-6 pl-6">
              <button className="btn-default" onClick={handleNextButtonClick}>
                Next
              </button>
            </div>
          ) : (
            <div className="col-md-6 pr-6">
              <button className="btn-default" onClick={handleRefreshDevice}>
                Refresh
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DeviceScanModal;
