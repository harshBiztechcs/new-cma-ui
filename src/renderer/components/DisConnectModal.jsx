import React from 'react';
import modalDisconnectSVG from '../assets/image/modal-disconnect.svg';

function DisConnectModal({ onConfirm, onCancel, deviceType }) {
  const normalMsg =
    'Please check your local connection with the device and try to reconnect again';
  const restartAppMsg =
    'Please check your local connection with the device or restart the application and try to reconnect again';

  return (
    <div id="disconnectmodal" className="modal">
      <div className="modal-content">
        <span className="close">X</span>
        <img src={modalDisconnectSVG} alt="Connect"></img>
        <h4>Device not found !</h4>
        <p>{deviceType === 'I1IO3' ? restartAppMsg : normalMsg}</p>
        <div className="row mt-28">
          <div className="col-md-6 pr-6">
            <button className="btn-primary" onClick={onConfirm}>
              Retry
            </button>
          </div>
          <div className="col-md-6 pl-6">
            <button className="btn-default" onClick={onCancel}>
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DisConnectModal;
