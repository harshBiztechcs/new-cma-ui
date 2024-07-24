import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import infoImage from '../assets/image/info.svg';
import cmaConnectLogo from '../assets/image/cma-connect.jpg';
const { ipcRenderer } = window.require('electron');
import { GET_TOKEN, LOGIN, URLRegex } from 'utility/constants';

function NewConnection({ afterNewConnection }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [instanceURL, setInstanceURL] = useState('https://');
  const [token, setToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [error, setError] = useState('');
  const [reqMsg, setReqMsg] = useState('');

  useEffect(() => {
    // register event
    ipcRenderer.on(GET_TOKEN, onGetToken);
    ipcRenderer.on(LOGIN, onLogin);
    return () => {
      ipcRenderer.removeListener(GET_TOKEN, onGetToken);
      ipcRenderer.removeListener(LOGIN, onLogin);
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
    };

    //perform login
    ipcRenderer.send(LOGIN, newConnObj);
  };

  const onGetToken = (_, args) => {
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

  const onLogin = (_, args) => {
    if (args.res) {
      const connInfo = {
        ...args,
        socketURL: args.socketURL,
        thirdPartyAPIUser: args.thirdPartyAPIUser,
      };
      afterNewConnection(connInfo);
      setError('');
      setReqMsg('');
    } else {
      setToken('');
      setError(args.error);
    }
  };

  const onGenerateToken = () => {
    if (checkInstanceURLValid()) {
      ipcRenderer.send(GET_TOKEN, { instanceURL, username, password });
    }
  };

  return (
    <div id="main">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-6 left-section">
            <div className="login">
              <Header />
              <form onSubmit={handleSubmit}>
                <div className="form-main">
                  <div className="form">
                    <h1>New Connection</h1>
                    <p>Please enter your credentials.</p>
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
                          <img
                            src={infoImage}
                            alt="Info"
                            className="info-image"
                          />
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
                          <img
                            src={infoImage}
                            alt="Info"
                            className="info-image"
                          />
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
                        className="btn-primary"
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
                      {error}{' '}
                      <a href="mailto:help@cmaimaging.com">Need help ?</a>
                    </p>
                  )}
                  {reqMsg && (
                    <p className="login-error-msg" style={{ color: 'black' }}>
                      {reqMsg}{' '}
                    </p>
                  )}
                </div>
              </form>
              <Footer />
            </div>
          </div>
          <div className="col-md-6 right-section">
            <img src={cmaConnectLogo} alt="CMA Connect" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewConnection;
