import React from 'react';
function Loader({ message }) {
  return (
    <div id="disconnectmodal" className="modal">
      <div
        style={{
          backgroundColor: 'transparent',
          color: 'white',
          boxShadow: 'none',
          display: 'flex',
        }}
        className="modal-content"
      >
        <div className="loader"></div>
        <div style={{ marginLeft: '10px' }}>{message}</div>
      </div>
    </div>
  );
}

export default Loader;
