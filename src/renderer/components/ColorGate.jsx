import React, { useEffect, useState } from 'react';
import {
  CHECK_THIRD_PARTY_API_CONNECTION,
  COLOR_GATE_SERVER_CONNECTION_REQ,
  CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
  GET_IP,
  URLRegex,
  COLOR_GATE_UPDATE_LICENSE,
  filePathRegexCCT,
} from 'utility/constants';
import APILogList from './APILogList';

const { ipcRenderer } = window.electron;

// const ipv4 = ipcRenderer.send(GET_IP, null);
// const ipAddress = ipv4 ? `https://${ipv4}` : '';

const IndicatorStyle = {
  background: '#28B62C',
  display: 'inline-block',
  width: '19px',
  height: '19px',
  borderRadius: '50%',
  verticalAlign: 'bottom',
};

export default function ColorGate({
  instanceURL,
  colorGateAPILog,
  socketConnection,
  colorGateConnection,
  setColorGateConnection,
  colorGateSocketConnection,
  socketConnectionInProgress,
  setSocketConnectionInProgress,
}) {
  console.log('======== Inside ThirdPartyAPI ColorGate ========');
  const [checkConnection, setCheckConnection] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiBaseURL, setApiBaseURL] = useState();
  const [port, setPort] = useState(443);
  const [colorGateLicense, setColorGateLicense] = useState('');
  const [filePath, setFilePath] = useState('');
  const [error, setError] = useState('');
  const [gettingLocalIp, setGettingLocalIp] = useState(false);
  const [ipv4, setipv4] = useState('');

  useEffect(() => {
    const handleGetIpResponse = (useEffect(() => {
  const handleGetIpResponse = (ipVersion) => {
    console.log('ipVersion', ipVersion);
    setApiBaseURL(`https://${ipVersion}`);
    setTimeout(() => {
      setGettingLocalIp(false);
    }, 100);
    setIpv4(ipVersion);
  };

  ipcRenderer.on('getIp', handleGetIpResponse);
  ipcRenderer.send('getIp');

  return () => {
    ipcRenderer.removeListener('getIp', handleGetIpResponse);
  };
}, []);) => {
      setApiBaseURL(`https://${ipVersion}`);
      setTimeout(() => {
        setGettingLocalIp(false);
      }, 100);
      setIpv4(ipVersion);
    };
  
    ipcRenderer.on('getIp', handleGetIpResponse);
    ipcRenderer.send('getIp');
  
    return () => {
      ipcRenderer.removeListener('getIp', handleGetIpResponse);
    };
  }, []);

  const connectionBtnText = ` ${
    checkConnection
      ? 'Checking Connection...'
      : colorGateConnection
        ? 'Connection Successful'
        : 'Connection Failed'
  }`;

  const colorgateServerConnectionBtnText = `${
    socketConnectionInProgress
      ? 'Processing...'
      : colorGateSocketConnection
        ? 'Disconnect Server'
        : 'Connect Server'
  }`;

  useEffect(() => {
    ipcRenderer.on(
      CHECK_THIRD_PARTY_API_CONNECTION,
      onCheckThirdPartyAPIConnection,
    );
    ipcRenderer.on(
      CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
      onColorGateDisconnectionAPIRes,
    );
    return () => {
      console.log('CLOSING THIRD PARTY API ');
      ipcRenderer.removeListener(
        CHECK_THIRD_PARTY_API_CONNECTION,
        onCheckThirdPartyAPIConnection,
      );
      ipcRenderer.removeListener(
        CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
        onColorGateDisconnectionAPIRes,
      );
    };
  }, []);

  useEffect(() => {
    // get info from local storage
    let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
    console.log({ thirdPartyAPIConfig, username, password });
    if (thirdPartyAPIConfig) {
      thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfig);
      if (thirdPartyAPIConfig.auth) {
        const decodedAuth = atob(thirdPartyAPIConfig.auth) ?? null;
        console.log({ decodedAuth });
        if (decodedAuth) {
          const [username, password] = decodedAuth.split(':');
          const apiConfig = {
            username: username || '',
            password: password || '',
            apiBaseURL: thirdPartyAPIConfig.apiBaseURL
              ? thirdPartyAPIConfig.apiBaseURL
              : apiBaseURL,
            port: thirdPartyAPIConfig.port ? thirdPartyAPIConfig.port : 443,
            colorGateLicense: thirdPartyAPIConfig.colorGateLicense
              ? thirdPartyAPIConfig.colorGateLicense
              : '',
            filePath: thirdPartyAPIConfig.filePath
              ? thirdPartyAPIConfig.filePath
              : '',
          };
          setUsername(apiConfig.username);
          setPassword(apiConfig.password);
          setApiBaseURL(apiConfig.apiBaseURL);
          setColorGateLicense(apiConfig.colorGateLicense);
          setFilePath(apiConfig.filePath);
          setPort(apiConfig.port);

          console.log({
            validate: validateAPIConfig(apiConfig),
          });

          if (!validateAPIConfig(apiConfig)) {
            handleCheckThirdPartyAPIConnectionClick({
              ...apiConfig,
              shouldLogged: false,
            });
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    updateLocalStorageThirdPartyAPIConfig({
      colorGateConnection,
    });
  }, [colorGateConnection]);

  useEffect(() => {
    if (!checkConnection && colorGateConnection) {
      console.log('=========== useEffect for server connection ===========');
      console.log({ checkConnection, colorGateConnection, socketConnection });
      console.log({ username, password, colorGateSocketConnection });
      // check if colorGateLicense has changed and connection is successful
      // then call colorGate de-active api to disable previous session on cma
      let thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
      console.log({ thirdPartyAPIConfig });
      if (thirdPartyAPIConfig) {
        thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfig);
        if (
          colorGateLicense &&
          thirdPartyAPIConfig.colorGateLicense &&
          thirdPartyAPIConfig.colorGateLicense !== colorGateLicense
        ) {
          // call disconnect colorGate api
          console.log(' === calling disconnect colorGate api === ');
          ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
            instanceURL,
            status: 'disconnect',
            licence: thirdPartyAPIConfig.colorGateLicense,
            licenceUpdate: true,
          });
          ipcRenderer.send(COLOR_GATE_UPDATE_LICENSE, {
            licence: colorGateLicense,
          });
        }
      }
      updateLocalStorageThirdPartyAPIConfig({
        auth: btoa(`${username}:${password}`),
        apiBaseURL,
        port,
        colorGateLicense,
        filePath,
      });
      if (!colorGateSocketConnection && socketConnection) {
        handleServerConnection();
      }
    }
  }, [checkConnection, colorGateConnection, socketConnection]);

  const updateLocalStorageThirdPartyAPIConfig = (obj) => {
    console.log('updateLocalStorage');
    console.log({ obj });
    const thirdPartyAPIConfig = localStorage.getItem('thirdPartyAPIConfig');
    const newConfig = {
      ...JSON.parse(thirdPartyAPIConfig),
      ...obj,
    };
    localStorage.setItem('thirdPartyAPIConfig', JSON.stringify(newConfig));
  };

  const handleServerConnection = () => {
    console.log('handleServerConnection');
    setSocketConnectionInProgress(true);
    console.log('setSocketConnectionInProgress(true)');
    console.log({ colorGateSocketConnection });
    if (colorGateSocketConnection) {
      ipcRenderer.send(COLOR_GATE_SERVER_CONNECTION_REQ, {
        isConnected: true,
        colorGateLicense,
      });
      // call disconnect colorGate api
      console.log(' === calling disconnect colorGate api === ');
      ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
        instanceURL,
        status: 'disconnect',
        licence: colorGateLicense,
      });
    } else if (colorGateLicense) {
      ipcRenderer.send(COLOR_GATE_SERVER_CONNECTION_REQ, {
        isConnected: false,
        colorGateLicense,
      });
    }
  };

  const onCheckThirdPartyAPIConnection = (args) => {
    setCheckConnection(false);
    if (
      args.colorGateAPI?.response?.data &&
      args.colorGateAPI?.response?.data?.status?.code == 200
    ) {
      setColorGateConnection(true);
    } else {
      setColorGateConnection(false);
    }
  };

  const onColorGateDisconnectionAPIRes = (args) => {
    if (!args.result) {
      setError(args.error);
    }
  };

  const handleCheckThirdPartyAPIConnectionClick = ({
    username,
    password,
    apiBaseURL,
    port,
    shouldLogged,
    filePath,
  }) => {
    setCheckConnection(true);
    const requestObj = {
      shouldLogged,
      filePath,
      colorGateAPI: {
        request: {
          baseURL: `${apiBaseURL}:${port}`,
          url: '/v1/system/status',
          method: 'get',
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            Authorization: `Basic ${btoa(`${username}:${password}`)}`,
          },
        },
      },
    };
    ipcRenderer.send(CHECK_THIRD_PARTY_API_CONNECTION, requestObj);
  };

  const validateAPIConfig = ({
    username,
    password,
    apiBaseURL,
    port,
    colorGateLicense,
    filePath,
  }) => {
    let valError = '';
    if (username.trim() == '') {
      valError = 'Username is required';
    } else if (password.trim() == '') {
      valError = 'Password is required';
    } else if (apiBaseURL.trim() == '') {
      valError = 'API base url is required';
    } else if (!URLRegex.test(apiBaseURL)) {
      valError = 'API base url is not valid';
    } else if (apiBaseURL.slice(-1) == '/') {
      valError = "Remove '/' at the end of the API base url";
    } else if (+port <= 0) {
      valError = 'Port number is required';
    } else if (colorGateLicense.trim() == '') {
      valError = 'License is required';
    } else if (filePath && !filePathRegexCCT.test(filePath)) {
      valError = 'File Path is not valid';
    }
    return valError;
  };

  const onGetLocalIP = () => {
    setGettingLocalIp(true);
    if (ipv4) {
      setApiBaseURL(`https://${ipv4}`);
      setTimeout(() => {
        setGettingLocalIp(false);
      }, 100);
    } else {
      ipcRenderer.send(GET_IP, null);
    }
  };

  const onCheckConnectionAndSave = async (e) => {
    e.preventDefault();
    const valError = validateAPIConfig({
      username,
      password,
      apiBaseURL,
      port,
      colorGateLicense,
      filePath,
    });
    setError(valError);
    if (valError) return;

    handleCheckThirdPartyAPIConnectionClick({
      username,
      password,
      apiBaseURL,
      port,
      shouldLogged: true,
      filePath,
    });
  };

  return (
    <div>
      <div style={{ marginTop: '10px' }}>
        <div className="d-flex justify-content-between mb-10">
          <button className="btn-secondary mr-12">
            <span
              style={{
                ...IndicatorStyle,
                cursor: 'default',
                borderColor: 'white',
                marginRight: '10px',
                float: 'left',
                backgroundColor: checkConnection
                  ? 'lightgrey'
                  : colorGateConnection
                    ? 'lightgreen'
                    : 'orangered',
              }}
            />
            {connectionBtnText}
          </button>
          <div>
            <button className="btn-secondary mr-12" onClick={onGetLocalIP}>
              {gettingLocalIp ? 'Please wait' : 'Get Local IP'}
            </button>
            <button
              className="btn-secondary mr-12"
              onClick={onCheckConnectionAndSave}
            >
              Check connection & Save
            </button>
            <button className="btn-secondary" onClick={handleServerConnection}>
              {colorgateServerConnectionBtnText}
            </button>
          </div>
        </div>
        <form>
          <div className="form-main">
            <div className="form">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    className="form-control"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    placeholder="Enter your password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="url">API Base URL</label>
                  <div className="p-relative">
                    <input
                      type="url"
                      id="url"
                      name="url"
                      className="form-control"
                      placeholder="Enter the URL"
                      value={apiBaseURL}
                      onChange={(e) => setApiBaseURL(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="port">Port</label>
                  <div className="p-relative">
                    <input
                      type="number"
                      id="port"
                      name="port"
                      className="form-control"
                      placeholder="Enter the port"
                      value={port}
                      min="0"
                      onChange={(e) => setPort(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="color-gate-license">Licence</label>
                  <div className="p-relative">
                    <input
                      type="text"
                      id="color-gate-license"
                      name="color-gate-license"
                      className="form-control"
                      placeholder="Enter the licence"
                      value={colorGateLicense}
                      onChange={(e) => setColorGateLicense(e.target.value)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="color-gate-filepath">File Path</label>
                  <div className="p-relative">
                    <input
                      type="text"
                      id="color-gate-filepath"
                      name="color-gate-filepath"
                      className="form-control"
                      placeholder="Enter the file path"
                      value={filePath}
                      onChange={(e) => setFilePath(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <p
                style={{
                  color: '#ff0001',
                  textAlign: 'center',
                  fontSize: '14px',
                }}
              >
                {error}
              </p>
            </div>
          </div>
        </form>
      </div>
      <div style={{ marginTop: '20px' }}>
        <APILogList logData={colorGateAPILog} />
      </div>
    </div>
  );
}
