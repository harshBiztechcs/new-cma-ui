import React, { useState } from 'react';
import modalConnectSVG from '../assets/image/modal-connect.svg';

function ConnectModal({ onConfirm, onCancel }) {
  const [shouldDisconnect, setShouldDisconnect] = useState(false);

  return (
    <div id="connectmodal" className="modal">
      <div className="modal-content">
        <span className="close">X</span>
        <img src={modalConnectSVG} alt="Connect"></img>
        <h4>Device connected !</h4>
        <p>
          Connection established with the device. Go to instance will open the
          browser to use your device directly for your Colorportal Enterprise
          user account.
        </p>
        <label className="custom-checkbox">
          <input
            type="checkbox"
            defaultChecked={shouldDisconnect}
            onChange={() => {
              setShouldDisconnect(!shouldDisconnect);
            }}
          />{' '}
          Disconnect after 2 hours of device inactivity
          <span className="checkmark"></span>
        </label>
        <div className="row mt-28">
          <div className="col-md-6 pr-6">
            <button
              className="btn-primary"
              onClick={() => onConfirm(shouldDisconnect)}
            >
              Go to Instance
            </button>
          </div>
          <div className="col-md-6 pl-6">
            <button
              className="btn-default"
              onClick={() => onCancel(shouldDisconnect)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConnectModal;
