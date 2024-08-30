import React, { useEffect, useState } from 'react';
import modalDisconnectSVG from '../assets/image/modal-disconnect.svg';
import {
  CLIENT_SOCKET_ALREADY_EXIST_INSTANCE_1,
  CLIENT_SOCKET_ALREADY_EXIST_INSTANCE_2,
  CMA_API_FOR_COLOR_GATE_STATUS_UPDATE,
  COLOR_GATE_SERVER_CONNECTION_REQ,
  CONNECTION_STATUS_INSTANCE_1,
  CONNECTION_STATUS_INSTANCE_2,
  GET_TOKEN,
  LOGIN,
  URLRegex,
} from 'utility/constants';
const { ipcRenderer } = window.require('electron');
import infoImage from '../assets/image/info.svg';
import cmaConnectLogo from '../assets/image/cma-connect.jpg';

function MultiInstanceFormModal({
  onCancel,
  onThirdPartyAPI,
  setErrorAlreadyExist,
  setInstanceConnectionDetails,
  instanceConnectionDetails,
  setCountInstance,
  countInstance,
  setMultiInstanceForm,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [instanceURL, setInstanceURL] = useState('https://');
  const [token, setToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [error, setError] = useState('');
  const [reqMsg, setReqMsg] = useState('');

  useEffect(() => {
    ipcRenderer.on(GET_TOKEN, onGetToken);
    ipcRenderer.on(LOGIN, onLogin);
    ipcRenderer.on(CONNECTION_STATUS_INSTANCE_1, onConnectionStatusInstance1);
    ipcRenderer.on(CONNECTION_STATUS_INSTANCE_2, onConnectionStatusInstance2);
    ipcRenderer.on(
      CLIENT_SOCKET_ALREADY_EXIST_INSTANCE_1,
      onClientSocketAlreadyExist1
    );
    ipcRenderer.on(
      CLIENT_SOCKET_ALREADY_EXIST_INSTANCE_2,
      onClientSocketAlreadyExist2
    );

    return () => {
      ipcRenderer.removeListener(GET_TOKEN, onGetToken);
      ipcRenderer.removeListener(LOGIN, onLogin);
      ipcRenderer.removeListener(
        CONNECTION_STATUS_INSTANCE_1,
        onConnectionStatusInstance1
      );
      ipcRenderer.removeListener(
        CONNECTION_STATUS_INSTANCE_2,
        onConnectionStatusInstance2
      );
    };
  }, []);

  const checkInstanceURLValid = () => {
    if (instanceURL.trim() == '') {
      setError('Instance url is required');
      return false;
    } else if (!URLRegex.test(instanceURL)) {
      setError('Instance url is not valid');
      return false;
    } else if (instanceURL.slice(-1) == '/') {
      setError("Remove '/' at the end of the Instance URL");
      return false;
    }
    return true;
  };

  const onGenerateToken = () => {
    if (checkInstanceURLValid()) {
      ipcRenderer.send(GET_TOKEN, { instanceURL, username, password });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let valError = '';
    if (username.trim() == '') {
      valError = 'Username is required';
    } else if (password.trim() == '') {
      valError = 'Password is required';
    } else if (instanceURL.trim() == '') {
      valError = 'Instance url is required';
    } else if (!URLRegex.test(instanceURL)) {
      valError = 'Instance url is not valid';
    } else if (instanceURL.slice(-1) == '/') {
      valError = "Remove '/' at the end of the Instance URL";
    } else if (token.trim() == '') {
      valError = 'Token is required';
    }
    setError(valError);
    if (valError) return;
    const newConnObj = {
      username,
      password,
      instanceURL,
      token,
      tokenExpiry,
      countInstance,
    };

    ipcRenderer.send(LOGIN, newConnObj);
  };

  const onGetToken = (event, args) => {
    if (args.res) {
      setError((state) => {
        if (
          state ==
          'Unable to load token, verify your credentials and try again !'
        ) {
          setError('');
        }
      });
      setToken(args.token);
      setTokenExpiry(args.tokenExpiry);
    } else {
      setError(args.error);
      setToken('');
      setTokenExpiry(null);
    }
  };

  const onLogin = (event, args) => {
    if (args.res) {
      const connectionInfo = {
        ...args,
        socketURL: args.socketURL,
        thirdPartyAPIUser: args.thirdPartyAPIUser,
      };

      const handleSocketInstance = (instanceNumber) => {
        const event = `CONNECT_SOCKET_INSTANCE_${instanceNumber}`;
        const localStorageKey = `thirdPartyAPIConfigInstance${instanceNumber}`;

        ipcRenderer.send(event, connectionInfo);
        localStorage.setItem(localStorageKey, JSON.stringify(connectionInfo));
      };

      handleSocketInstance(countInstance);

      setInstanceConnectionDetails((prevConnectionData) => {
        prevConnectionData.push(connectionInfo);
        return prevConnectionData.map((connectionInfo, index) => ({
          ...connectionInfo,
          key: index + 1,
        }));
      });

      onThirdPartyAPI(true);

      setError('');
      setReqMsg('');
    } else {
      setToken('');
      setError(args.error);
    }
  };

  const onClientSocketAlreadyExist1 = (event, args) => {
    if (args) {
      setErrorAlreadyExist({
        from: 1,
        msg: 'The app is already open on another system',
      });
    } else {
      onCancel(true);
    }
  };
  const onClientSocketAlreadyExist2 = (event, args) => {
    if (args) {
      setErrorAlreadyExist({
        from: 2,
        msg: 'The app is already open on another system',
      });
    } else {
      onCancel(true);
    }
  };

  const handleConnectionStatus = (args) => {
    const thirdPartyAPIConfigString = localStorage.getItem(
      'thirdPartyAPIConfig'
    );
    const userInfoString = localStorage.getItem('userInfo');

    if (thirdPartyAPIConfigString && userInfoString) {
      const thirdPartyAPIConfig = JSON.parse(thirdPartyAPIConfigString);
      const userInfo = JSON.parse(userInfoString);

      if (thirdPartyAPIConfig && userInfo) {
        ipcRenderer.send(COLOR_GATE_SERVER_CONNECTION_REQ, {
          isConnected: false,
          colorGateLicense: thirdPartyAPIConfig.colorGateLicense,
        });

        console.log(' === calling disconnect colorGate API === ');
        ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
          instanceURL: userInfo.instanceURL,
          status: 'disconnect',
          license: thirdPartyAPIConfig.colorGateLicense,
        });
        ipcRenderer.send(CMA_API_FOR_COLOR_GATE_STATUS_UPDATE, {
          instanceURL: userInfo.instanceURL,
          status: 'connect',
          license: thirdPartyAPIConfig.colorGateLicense,
        });
      }
    }
  };

  const onConnectionStatusInstance1 = (_event, args) => {
    if (args == 'connected') {
      console.log('Connected to the server');
      handleConnectionStatus();
      setCountInstance(countInstance + 1);
      setMultiInstanceForm(false);
    } else {
      setError('Server Connection Failed !!');
    }
  };

  const onConnectionStatusInstance2 = (event, args) => {
    if (args === 'connected') {
      console.log('Connected to the server');
      handleConnectionStatus();
      setMultiInstanceForm(false);
      setCountInstance(countInstance + 1);
    } else {
      setError('Server Connection Failed!');
    }
  };

  return (
    <div id="multiInstanceFormModal" className="modal">
      <div className="modal-content">
        <span className="close">X</span>
        <img src={modalDisconnectSVG} alt="Connect"></img>
        <h4> you can add other instance</h4>

        <form onSubmit={handleSubmit}>
          <div className="form-main">
            <div className="form">
              {/* <h1>New Connection</h1>
              <p>Please enter your credentials.</p> */}
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  className="form-control"
                  placeholder="Enter your email"
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
                <label htmlFor="url">Instance URL</label>
                <div className="p-relative">
                  <input
                    type="url"
                    id="url"
                    name="url"
                    className="form-control"
                    placeholder="Enter the Instance URL"
                    value={instanceURL}
                    onChange={(e) => setInstanceURL(e.target.value)}
                  />
                  <div className="tooltip">
                    {/* <img src={infoImage} alt="Info" className="info-image" /> */}
                    <span className="tooltiptext">
                      Type the URL for your instance
                    </span>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="token">Token</label>
                <div className="p-relative">
                  <input
                    type="password"
                    id="token"
                    name="token"
                    style={{ backgroundColor: '#e9ecef' }}
                    className="form-control"
                    value={token}
                    disabled
                    readOnly
                  />
                  <div className="tooltip">
                    {/* <img src={infoImage} alt="Info" className="info-image" /> */}
                    <span className="tooltiptext">
                      Token generated in the equipment app
                    </span>
                  </div>
                </div>
              </div>
              {URLRegex.test(instanceURL) && username && password ? (
                <button
                  onClick={onGenerateToken}
                  type="button"
                  className="btn-primary mt-12"
                >
                  Load Token
                </button>
              ) : null}
              <button type="submit" className="btn-primary mt-12">
                Sign in
              </button>
            </div>
            {error && (
              <p className="login-error-msg">
                {error} <a href="mailto:help@cmaimaging.com">Need help ?</a>
              </p>
            )}
            {reqMsg && (
              <p className="login-error-msg" style={{ color: 'black' }}>
                {reqMsg}{' '}
              </p>
            )}
          </div>
        </form>

        <div className="mt-12">
          <button className="btn-default w-100" onClick={onCancel}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export default MultiInstanceFormModal;
