import React, { useEffect, useState } from 'react';
import { LOGIN } from 'utility/constants';
import Header from '../components/Header';
import Footer from '../components/Footer';
import cmaConnectLogo from '../assets/image/cma-connect.jpg';

const { ipcRenderer } = window.electron;

function Login({
  afterLogin,
  onCreateNewConnection,
  preUsername,
  instanceURL,
  token,
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [reqMsg, setReqMsg] = useState('');

  useEffect(() => {
    // register event
    ipcRenderer.on(LOGIN, onLogin);
    return () => {
      ipcRenderer.removeListener(LOGIN, onLogin);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    let valError = '';
    if (username.trim() == '') {
      valError = 'Username is required !!';
    } else if (password.trim() == '') {
      valError = 'Password is required !!';
    }
    setError(valError);
    if (valError) return;

    const login = {
      username,
      password,
      instanceURL,
      token,
      remember,
    };

    // perform login
    ipcRenderer.send(LOGIN, login);
  };

  const onLogin = (args) => {
    if (args.res) {
      const connInfo = {
        ...args,
        socketURL: args.socketURL,
        thirdPartyAPIUser: args.thirdPartyAPIUser,
      };
      afterLogin(connInfo);
      setError('');
      setReqMsg('');
    } else {
      setError(args.error);
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
                    <h1>Log in</h1>
                    <p>Welcome back! Please enter your credentials.</p>
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
                      <label className="custom-checkbox">
                        Remember for 7 days
                        <input
                          type="checkbox"
                          name="remember"
                          defaultChecked={remember}
                          onChange={() => setRemember(!remember)}
                        />
                        <span className="checkmark" />
                      </label>
                    </div>
                    <button type="submit" className="btn-primary">
                      Sign in
                    </button>
                  </div>
                  <p className="update-token">
                    Need to update the token ?{' '}
                    <a onClick={onCreateNewConnection}>New connection</a>
                  </p>
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

export default Login;
