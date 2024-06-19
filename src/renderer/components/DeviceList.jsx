import React, { useState } from 'react';
import { deviceStatusType } from 'utility/constants';
import i1pro3Icon from '../assets/image/i1pro3.jpeg';
import i1pro2Icon from '../assets/image/i1pro2.jpeg';
import ci64Icon from '../assets/image/ci64.jpeg';
import exactIcon from '../assets/image/exact.png';
import exact2Icon from '../assets/image/exact2.png';
import CMAROP64EUVIcon from '../assets/image/CMA-ROP64E-UV.png';
import i1ioIcon from '../assets/image/i1io.jpeg';
import onlineIndicatorImg from '../assets/image/online-indicator.svg';

const getDeviceImg = (deviceType) => {
  switch (deviceType) {
    case 'I1PRO3':
      return i1pro3Icon;
    case 'I1PRO2':
      return i1pro2Icon;
    case 'CI64':
      return ci64Icon;
    case 'CI64UV':
      return ci64Icon;
    case 'CI62':
      return ci64Icon;
    case 'EXACT':
      return exactIcon;
    case 'EXACT2':
      return exact2Icon;
    case 'I1IO3':
      return i1ioIcon;
    case 'I1IO2':
      return i1ioIcon;
    case 'CMA-ROP64E-UV':
    case 'CMA-ROP64E-UV-BT':
      return CMAROP64EUVIcon;
    default:
      return i1pro3Icon;
  }
};

function DeviceList({
  deviceList,
  onConnect,
  onDisconnect,
  connectedDevice,
  onGoBackToMeasure,
  onBluetoothConnection,
}) {
  const [device, setDevice] = useState(connectedDevice);
  const selectedDevice = deviceList.find((x) => x.deviceId === device);

  const statusClassList = {
    connected: 'status connected',
    available: 'status available',
    not_available: 'status not-available',
  };

  const getListStyle = (status, isCurrent) => {
    if (status == 'not_available') {
      return { backgroundColor: 'whitesmoke' };
    }
    if (status == 'connected' && !isCurrent) {
      return { backgroundColor: 'whitesmoke' };
    }
    return {};
  };

  const render =
    deviceList.length == 0 ? (
      <p style={{ textAlign: 'center' }}>No Devices Available Currently</p>
    ) : (
      <div className="products-list">
        <table
          className="table productselect-table scrolling-table"
          cellSpacing="0"
        >
          <thead>
            <tr>
              <th>Device name and licence id</th>
              <th>Serial #</th>
              <th>Connected by user</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {deviceList.map((dev, index) => (
              <tr
                key={dev.deviceId}
                style={getListStyle(
                  dev.status,
                  dev.deviceId == connectedDevice
                )}
              >
                <td>
                  <div className="d-flex align-items-center">
                    <label className="custom-checkbox">
                      <input
                        type="radio"
                        name="deviceSelection"
                        defaultChecked={dev.deviceId == connectedDevice}
                        // defaultChecked={dev.status == 'connected'}
                        disabled={connectedDevice || dev.status !== 'available'}
                        onChange={() => {
                          setDevice(dev.deviceId);
                        }}
                      />
                      <span className="checkmark"></span>
                    </label>
                    <div className="product-thumbnail">
                      <img
                        className="product-img"
                        src={getDeviceImg(dev.deviceType)}
                        alt="Product"
                      ></img>
                      {dev.status == 'connected' && (
                        <img
                          className="connected_indicator"
                          src={onlineIndicatorImg}
                          alt="Online Indicator"
                        ></img>
                      )}
                    </div>
                    <div className="product-detail">
                      <p className="device-name">{dev.name ?? ''}</p>
                      <p className="licence-id">{dev.license ?? ''}</p>
                    </div>
                  </div>
                </td>
                <td>{dev.serial ?? ''}</td>
                <td>
                  <p className="user-name">{dev.username ?? ''}</p>
                  <p className="user-id">{dev.email ?? ''}</p>
                </td>
                <td>
                  {dev.deviceId == connectedDevice &&
                  dev.status == 'available' ? (
                    <div
                      className="status waiting-to-connect"
                      style={{ fontSize: '8px' }}
                    >
                      Waiting To Connect
                    </div>
                  ) : (
                    <div className={statusClassList[dev.status]}>
                      {deviceStatusType[`${dev.status}`] ?? ''}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4">
                {device && !connectedDevice && (
                  <div>
                    {selectedDevice && (
                      <div>
                        {selectedDevice.deviceType === 'CMA-ROP64E-UV' ? (
                          <div>
                            <button
                              className="btn-primary mr-12"
                              onClick={() => onConnect(device)}
                              disabled={!device}
                            >
                              USB Connect
                            </button>
                            <button
                              className="btn-primary mr-12"
                              onClick={() => onBluetoothConnection(device)}
                              disabled={!device}
                            >
                              Bluethooth Connect
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-primary mr-12"
                            onClick={() => onConnect(device)}
                            disabled={!device}
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {connectedDevice && (
                  <>
                    <button
                      className="btn-primary mr-12"
                      disabled={!device}
                      onClick={() => onDisconnect(device)}
                    >
                      Disconnect
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={!device}
                      onClick={onGoBackToMeasure}
                    >
                      Go back to measure
                    </button>
                  </>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );

  return render;
}

export default DeviceList;
