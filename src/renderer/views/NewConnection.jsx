/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import { GET_TOKEN, LOGIN, URLRegex } from 'utility/constants';
import Header from '../components/Header';
import Footer from '../components/Footer';
import infoImage from '../assets/image/info.svg';
import cmaConnectLogo from '../assets/image/cma-connect.jpg';

const { ipcRenderer } = window.require('electron');

function NewConnection({ afterNewConnection }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [instanceURL, setInstanceURL] = useState('https://');
  const [token, setToken] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [error, setError] = useState('');
  const [reqMsg, setReqMsg] = useState('');

  const handleGetToken = (event, args) => {
    if (args.res) {
      if (
        error ===
        'Unable to load token, verify your credentials and try again !'
      ) {
        setError('');
      }
      setToken(args.token);
      setTokenExpiry(args.tokenExpiry);
    } else {
      setError(args.error);
      setToken('');
      setTokenExpiry(null);
    }
  };

  const handleLogin = (event, args) => {
    if (args.res) {
      afterNewConnection({
        ...args,
        socketURL: args.socketURL,
        thirdPartyAPIUser: args.thirdPartyAPIUser,
      });
      setError('');
      setReqMsg('');
    } else {
      setToken('');
      setError(args.error);
    }
  };

  useEffect(() => {
    ipcRenderer.on(GET_TOKEN, handleGetToken);
    ipcRenderer.on(LOGIN, handleLogin);

    return () => {
      ipcRenderer.removeListener(GET_TOKEN, handleGetToken);
      ipcRenderer.removeListener(LOGIN, handleLogin);
    };
  }, []);

  const isURLValid = (url) => URLRegex.test(url) && !url.endsWith('/');

  const checkInstanceURLValid = () => {
    if (instanceURL.trim() === '') {
      setError('Instance URL is required.');
      return false;
    }
    if (!isURLValid(instanceURL)) {
      setError('Instance URL is not valid or has trailing slash.');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let validationError = '';

    if (username.trim() === '') {
      validationError = 'Username is required.';
    } else if (password.trim() === '') {
      validationError = 'Password is required.';
    } else if (instanceURL.trim() === '') {
      validationError = 'Instance URL is required.';
    } else if (!isURLValid(instanceURL)) {
      validationError = 'Instance URL is not valid or has trailing slash.';
    } else if (token.trim() === '') {
      validationError = 'Token is required.';
    }

    if (validationError) {
      setError(validationError);
      return;
    }

    const newConnection = {
      username,
      password,
      instanceURL,
      token,
      tokenExpiry,
    };

    ipcRenderer.send(LOGIN, newConnection);
  };

  const handleGenerateToken = () => {
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
                        className="form-control"
                        placeholder="Enter your password"
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
                          className="form-control"
                          style={{ backgroundColor: '#e9ecef' }}
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

                    {isURLValid(instanceURL) && username && password && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleGenerateToken}
                      >
                        Load Token
                      </button>
                    )}
                    <button type="submit" className="btn-primary mt-12">
                      Sign in
                    </button>
                  </div>

                  {error && (
                    <p className="login-error-msg">
                      {error}{' '}
                      <a href="mailto:help@cmaimaging.com">Need help?</a>
                    </p>
                  )}
                  {reqMsg && (
                    <p className="login-error-msg" style={{ color: 'black' }}>
                      {reqMsg}
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
