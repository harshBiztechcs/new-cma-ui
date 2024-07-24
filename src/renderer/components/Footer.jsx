import React from 'react';
import { GET_APP_VERSION } from 'utility/constants';

const { ipcRenderer } = window.require('electron');
const currentAppVersion = ipcRenderer.sendSync(GET_APP_VERSION);

function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <>
      <footer className="copy-right">
        <p>
          {`© CMA IMAGING ${currentYear}. All right reserved. CMA Connect App Version ${currentAppVersion}`}
        </p>
      </footer>
    </>
  );
}

export default Footer;
