import React, { useEffect } from 'react';
import modalDisconnectSVG from '../assets/image/modal-disconnect.svg';
const { ipcRenderer } = window.require('electron');

function MultiInstanceListModal({
  onCancel,
  setMultiInstanceForm,
  setErrorAlreadyExist,
  errorAlreadyExist,
  setInstanceConnectionDetails,
  instanceConnectionDetails,
  setCountInstance,
  countInstance,
}) {
  useEffect(() => {
    if (errorAlreadyExist && errorAlreadyExist.from == 1) {
      setInstanceConnectionDetails((prevItems) => prevItems.slice(0, -1));
      setCountInstance(countInstance - 1);
    }
    if (errorAlreadyExist && errorAlreadyExist.from == 2) {
      setInstanceConnectionDetails((prevItems) => prevItems.slice(0, -1));
      setCountInstance(countInstance - 1);
    }
  }, [errorAlreadyExist]);

  const disconnectInstance = (key) => {
    console.log(
      `MultiInstanceListModal.jsx:18 ~ disconnectInstance DISCONNECT_SOCKET_INSTANCE_${key}`
    );
    ipcRenderer.send(`DISCONNECT_SOCKET_INSTANCE_${key}`);

    setInstanceConnectionDetails((prevInstanceConnectionInfo) => {
      return prevInstanceConnectionInfo.filter((obj) => obj.key !== key);
    });
    console.log(
      '🚀 ~ file: MultiInstanceListModal.jsx:32 ~ disconnectInstance ~ countInstance:',
      countInstance
    );

    setCountInstance(countInstance - 1);
  };
  return (
    <div id="multiInstanceListModal" className="modal">
      <div className="modal-content">
        <span className="close">X</span>
        <img src={modalDisconnectSVG} alt="Connect"></img>
        {errorAlreadyExist && (
          <>
            <h5>{errorAlreadyExist?.msg}</h5>
          </>
        )}
        <h4> you can see other instance</h4>
        {countInstance > 0 &&
          Array.isArray(instanceConnectionDetails) &&
          instanceConnectionDetails.map((obj, idx) => (
            <div className="mt-12" key={idx}>
              <b>{obj?.username}</b> - {obj?.instanceURL}
              <button
                className="btn-default"
                onClick={() => disconnectInstance(obj.key)}
              >
                Disconnect
              </button>
            </div>
          ))}

        {countInstance <= 2 && (
          <button
            className="btn-primary mt-12"
            onClick={() => {
              setMultiInstanceForm(true);
              setErrorAlreadyExist('');
            }}
          >
            + Add Instance
          </button>
        )}
        <div className="mt-12">
          <button className="btn-default" onClick={onCancel}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default MultiInstanceListModal;
