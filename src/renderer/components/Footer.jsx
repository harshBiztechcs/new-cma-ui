import React, { useCallback, useEffect, useState } from 'react';
import { GET_APP_VERSION } from 'utility/constants';

function Footer() {
  const [currentAppVersion, setCurrentAppVersion] = useState('');

  const getAppVersion = useCallback((version) => {
    setCurrentAppVersion(version);
  }, []);

  useEffect(() => {
    const { ipcRenderer } = window.electron;

    ipcRenderer.on(GET_APP_VERSION, getAppVersion);
    ipcRenderer.send(GET_APP_VERSION);

    return () => {
      ipcRenderer.removeAllListeners(GET_APP_VERSION);
    };
  }, [getAppVersion]);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="copy-right">
      <p>
        {`© CMA IMAGING ${currentYear}. All rights reserved. CMA Connect App Version ${currentAppVersion}`}
      </p>
    </footer>
  );
}

export default Footer;
