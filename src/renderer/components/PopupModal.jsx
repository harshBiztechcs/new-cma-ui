import React from 'react';
import modalDisconnectSVG from '../assets/image/modal-disconnect.svg';
import modalConnectSVG from '../assets/image/modal-connect.svg';

function PopupModal({
  title,
  message,
  onConfirm,
  confirmBtnText,
  onCancel,
  cancelBtnText,
  isSuccess,
}) {
  return (
    <div id="disconnectmodal" className="modal">
      <div className="modal-content">
        <span className="close">X</span>
        {isSuccess ? (
          <img src={modalConnectSVG} alt="success"></img>
        ) : (
          <img src={modalDisconnectSVG} alt="failure"></img>
        )}
        <h4>{title}</h4>
        <p>{message}</p>
        {(onConfirm || onCancel) && (
          <div className="row mt-28">
            {onConfirm && (
              <div className="col-md-6 pr-6">
                <button className="btn-primary" onClick={onConfirm}>
                  {confirmBtnText}
                </button>
              </div>
            )}
            {onCancel && (
              <div className="col-md-6 pl-6">
                <button className="btn-default" onClick={onCancel}>
                  {cancelBtnText}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PopupModal;
