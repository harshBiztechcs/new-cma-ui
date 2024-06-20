import React, { useEffect, useState } from 'react';
import {
  TEST_ALWAN_API_CONNECTION,
  ALWAN_SERVER_CONNECTION_REQ,
  CMA_API_FOR_ALWAN_STATUS_UPDATE,
  GET_IP,
  URLRegex,
  ALWAN_UPDATE_LICENSE,
} from 'utility/constants';
import APILogList from './APILogList';

const ipv4 = window.electron.ipcRenderer.send(GET_IP, null);
const ipAddress = ipv4 ? `http://${ipv4}` : '';

const IndicatorStyle = {
  background: '#28B62C',
  display: 'inline-block',
  width: '19px',
  height: '19px',
  borderRadius: '50%',
  verticalAlign: 'bottom',
};

export default function AlwanAPI({
  instanceURL,
  alwanAPILog,
  socketConnection,
  alwanConnection,
  setAlwanConnection,
  alwanSocketConnection,
  alwanSocketConnectionInProgress,
  setAlwanSocketConnectionInProgress,
}) {
  console.log('======== Inside AlwanAPI Alwan ========');
  const [checkConnection, setCheckConnection] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [apiBaseURL, setApiBaseURL] = useState(ipAddress);
  const [port, setPort] = useState(8751);
  const [alwanLicense, setAlwanLicense] = useState('');
  const [error, setError] = useState('');
  const [gettingLocalIp, setGettingLocalIp] = useState(false);

  const connectionBtnText = ` ${
    checkConnection
      ? 'Checking Connection...'
      : alwanConnection
      ? 'Connection Successful'
      : 'Connection Failed'
  }`;

  const alwanServerConnectionBtnText = `${
    alwanSocketConnectionInProgress
      ? 'Processing...'
      : alwanSocketConnection
      ? 'Disconnect Server'
      : 'Connect Server'
  }`;

  useEffect(() => {
    window.electron.ipcRenderer.on(TEST_ALWAN_API_CONNECTION, onCheckAlwanAPIConnection);
    window.electron.ipcRenderer.on(CMA_API_FOR_ALWAN_STATUS_UPDATE, onAlwanDisconnectionAPIRes);
    return () => {
      console.log('CLOSING ALWAN API ');
      window.electron.ipcRenderer.removeListener(
        TEST_ALWAN_API_CONNECTION,
        onCheckAlwanAPIConnection
      );
      window.electron.ipcRenderer.removeListener(
        CMA_API_FOR_ALWAN_STATUS_UPDATE,
        onAlwanDisconnectionAPIRes
      );
    };
  }, []);

  useEffect(() => {
    //get info from local storage
    let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
    console.log({ alwanAPIConfig, username, password });
    if (alwanAPIConfig) {
      alwanAPIConfig = JSON.parse(alwanAPIConfig);
      if (alwanAPIConfig.auth) {
        const decodedAuth = atob(alwanAPIConfig.auth) ?? null;
        console.log({ decodedAuth });
        if (decodedAuth) {
          const [username, password] = decodedAuth.split(':');
          const apiConfig = {
            username: username ? username : '',
            password: password ? password : '',
            apiBaseURL: alwanAPIConfig.apiBaseURL
              ? alwanAPIConfig.apiBaseURL
              : ipAddress,
            port: alwanAPIConfig.port ? alwanAPIConfig.port : 443,
            alwanLicense: alwanAPIConfig.alwanLicense
              ? alwanAPIConfig.alwanLicense
              : '',
          };
          setUsername(apiConfig.username);
          setPassword(apiConfig.password);
          setApiBaseURL(apiConfig.apiBaseURL);
          setAlwanLicense(apiConfig.alwanLicense);
          setPort(apiConfig.port);

          console.log({
            validate: validateAPIConfig(apiConfig),
          });

          if (!validateAPIConfig(apiConfig)) {
            handleCheckAlwanAPIConnectionClick({
              ...apiConfig,
              shouldLogged: false,
            });
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    updateLocalStorageAlwanAPIConfig({
      alwanConnection,
    });
  }, [alwanConnection]);

  useEffect(() => {
    if (!checkConnection && alwanConnection) {
      console.log('=========== useEffect for server connection ===========');
      console.log({ checkConnection, alwanConnection, socketConnection });
      console.log({ username, password, alwanSocketConnection });
      //check if alwanLicense has changed and connection is successful
      //then call alwan de-active api to disable previous session on cma
      let alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
      console.log({ alwanAPIConfig });
      if (alwanAPIConfig) {
        alwanAPIConfig = JSON.parse(alwanAPIConfig);
        if (
          alwanLicense &&
          alwanAPIConfig.alwanLicense &&
          alwanAPIConfig.alwanLicense !== alwanLicense
        ) {
          //call disconnect alwan api
          console.log(' === calling disconnect alwan api === ');
          window.electron.ipcRenderer.send(CMA_API_FOR_ALWAN_STATUS_UPDATE, {
            instanceURL,
            status: 'disconnect',
            licence: alwanAPIConfig.alwanLicense,
            licenceUpdate: true,
          });
          window.electron.ipcRenderer.send(ALWAN_UPDATE_LICENSE, {
            licence: alwanLicense,
          });
        }
      }
      updateLocalStorageAlwanAPIConfig({
        auth: btoa(`${username}:${password}`),
        apiBaseURL,
        port,
        alwanLicense,
      });
      if (!alwanSocketConnection && socketConnection) {
        handleServerConnection();
      }
    }
  }, [checkConnection, alwanConnection, socketConnection]);

  const updateLocalStorageAlwanAPIConfig = (obj) => {
    console.log('updateLocalStorage');
    console.log({ obj });
    const alwanAPIConfig = localStorage.getItem('alwanAPIConfig');
    const newConfig = {
      ...JSON.parse(alwanAPIConfig),
      ...obj,
    };
    localStorage.setItem('alwanAPIConfig', JSON.stringify(newConfig));
  };

  const handleServerConnection = () => {
    console.log('handleServerConnection');
    setAlwanSocketConnectionInProgress(true);
    console.log('setAlwanSocketConnectionInProgress(true)');
    console.log({ alwanSocketConnection });
    if (alwanSocketConnection) {
      window.electron.ipcRenderer.send(ALWAN_SERVER_CONNECTION_REQ, {
        isConnected: true,
        alwanLicense,
      });
      //call disconnect alwan api
      console.log(' === calling disconnect alwan api === ');
      window.electron.ipcRenderer.send(CMA_API_FOR_ALWAN_STATUS_UPDATE, {
        instanceURL,
        status: 'disconnect',
        licence: alwanLicense,
      });
    } else if (alwanLicense) {
      window.electron.ipcRenderer.send(ALWAN_SERVER_CONNECTION_REQ, {
        isConnected: false,
        alwanLicense,
      });
    }
  };

  const onCheckAlwanAPIConnection = (args) => {
    setCheckConnection(false);
    if (args?.status && args.status == 200) {
      setAlwanConnection(true);
    } else {
      setAlwanConnection(false);
    }
  };

  const onAlwanDisconnectionAPIRes = (args) => {
    if (!args.result) {
      setError(args.error);
    }
  };

  const handleCheckAlwanAPIConnectionClick = ({
    username,
    password,
    apiBaseURL,
    port,
    shouldLogged,
  }) => {
    setCheckConnection(true);
    const requestObj = {
      shouldLogged,
      alwanAPI: {
        request: {
          baseURL: `${apiBaseURL}:${port}`,
          url: '/info',
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
    window.electron.ipcRenderer.send(TEST_ALWAN_API_CONNECTION, requestObj);
  };

  const validateAPIConfig = ({
    username,
    password,
    apiBaseURL,
    port,
    alwanLicense,
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
    } else if (alwanLicense.trim() == '') {
      valError = 'License is required';
    }
    return valError;
  };

  const onGetLocalIP = () => {
    setGettingLocalIp(true);
    const ipv4 = window.electron.window.electron.ipcRenderer.send(GET_IP, null);
    if (ipv4) {
      setApiBaseURL(`http://${ipv4}`);
      setTimeout(() => {
        setGettingLocalIp(false);
      }, 100);
    }
  };

  const onCheckConnectionAndSave = async (e) => {
    e.preventDefault();
    let valError = validateAPIConfig({
      username,
      password,
      apiBaseURL,
      port,
      alwanLicense,
    });
    setError(valError);
    if (valError) return;

    handleCheckAlwanAPIConnectionClick({
      username,
      password,
      apiBaseURL,
      port,
      shouldLogged: true,
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
                  : alwanConnection
                  ? 'lightgreen'
                  : 'orangered',
              }}
            ></span>
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
              {alwanServerConnectionBtnText}
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
                  <label htmlFor="alwan-license">Licence</label>
                  <div className="p-relative">
                    <input
                      type="text"
                      id="alwan-license"
                      name="alwan-license"
                      className="form-control"
                      placeholder="Enter the licence"
                      value={alwanLicense}
                      onChange={(e) => setAlwanLicense(e.target.value)}
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
        <APILogList logData={alwanAPILog} />
      </div>
    </div>
  );
}
