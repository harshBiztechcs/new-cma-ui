/* eslint-disable no-console */
import axios from 'axios';
import https from 'https';

export const login = async (hostUrl, email, password, token) => {
  const timeout = 3500; // 3.5 seconds in milliseconds
  const loginUrl = `${hostUrl}/cma_connect/api/login`;

  try {
    console.log(`${loginUrl}?user=${email}&pass=${password}&token=${token}`);
    console.log({ params: { user: email, pass: password, token } });

    const abortController = new AbortController();

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        abortController.abort(); // Abort ongoing request on timeout
        resolve({
          res: false,
          error:
            'Request timed out. Unable to establish a connection within the specified time.',
          socketURL: null,
          thirdPartyAPIUser: null,
        });
      }, timeout);
    });

    const requestConfig = {
      params: { user: email, pass: password, token },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      signal: abortController.signal,
    };

    const response = await Promise.race([
      axios.post(loginUrl, undefined, requestConfig),
      timeoutPromise,
    ]);

    if (response && response.status === 200) {
      const {
        status,
        web_socket_url: socketURL,
        error_message: errorMessage,
        colorgate_user: thirdPartyAPIUser,
      } = response.data;

      if (status === 200) {
        return {
          res: true,
          error: null,
          socketURL,
          thirdPartyAPIUser,
        };
      }
      const error =
        errorMessage === 'Access Denied'
          ? 'Unable to connect. Please verify your credentials and try again!'
          : errorMessage;

      return {
        res: false,
        error,
        socketURL: null,
        thirdPartyAPIUser: null,
      };
    }
    return {
      res: false,
      error: 'Unable to connect. Please verify your credentials and try again!',
    };
  } catch (err) {
    return {
      res: false,
      error:
        'Unable to connect. Please verify your credentials or network connection and try again!',
    };
  }
};

export const getToken = async ({ instanceURL, username, password }) => {
  const timeout = 3500; // 3.5 seconds in milliseconds

  try {
    const abortController = new AbortController();

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        abortController.abort(); // Abort ongoing request on timeout
        resolve({
          res: false,
          token: '',
          tokenExpiry: null,
          error:
            'Unable to load token, verify your credentials or network connection and try again!',
        });
      }, timeout);
    });

    const requestConfig = {
      params: { user: username, pass: password },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      signal: abortController.signal,
    };

    const response = await Promise.race([
      axios.post(`${instanceURL}/api/token_request`, undefined, requestConfig),
      timeoutPromise,
    ]);

    console.log({ params: { user: username, pass: password } });

    if (response && response.status === 200) {
      const {
        access_token: token,
        expire_date: tokenExpiry,
        error_message: error,
      } = response.data;

      if (error) {
        return {
          res: false,
          token: '',
          tokenExpiry: null,
          error: 'Unable to load token, verify your credentials and try again!',
        };
      }

      const tokenExpiryTime = Date.parse(tokenExpiry) || null;

      return { res: true, token, tokenExpiry: tokenExpiryTime };
    }
    return {
      res: false,
      token: '',
      tokenExpiry: null,
      error: 'Unable to load token, verify your credentials and try again!',
    };
  } catch (err) {
    console.log(err);
    return {
      res: false,
      token: '',
      tokenExpiry: null,
      error:
        'Unable to load token, verify your credentials or network connection and try again!',
    };
  }
};
