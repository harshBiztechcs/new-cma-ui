// temporary solution - avoid TLS warning
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const path = require('path');
const { default: axios } = require('axios');
const fs = require('fs');
const fsp = require('fs/promises');
const https = require('https');
const FormData = require('form-data');
const { getAssetPath } = require('./util');

const config = new https.Agent({ rejectUnauthorized: false });

export const clientDeviceReconnectAPICall = async (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
) => {
  try {
    await axios.post(
      `${instanceURL}/cma_connect/api/reconnect?device=${deviceName}&sr_no=${serialNumber}&device_id=${deviceId}`,
      undefined,
      config,
    );
  } catch (error) {}
};

export const clientDeviceDisconnectAPICall = async (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
) => {
  try {
    const timeout = 3500;

    const abortController = new AbortController();
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        abortController.abort();
        resolve(
          createErrorResponse(instanceURL, deviceId, deviceName, serialNumber),
        );
      }, timeout);
    });

    const requestConfig = {
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      signal: abortController.signal,
    };

    const endpoint = `${instanceURL}/cma_connect/api/disconnect?device=${deviceName}&sr_no=${serialNumber}&device_id=${deviceId}`;

    const responsePromise = axios.post(endpoint, undefined, requestConfig);
    const response = await Promise.race([responsePromise, timeoutPromise]);

    const status = response?.data?.status;

    if (status === 200) {
      return createSuccessResponse(
        instanceURL,
        deviceId,
        deviceName,
        serialNumber,
      );
    }
    return createErrorResponse(instanceURL, deviceId, deviceName, serialNumber);
  } catch (error) {
    return createErrorResponse(instanceURL, deviceId, deviceName, serialNumber);
  }
};

const createSuccessResponse = (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
) => {
  return {
    res: true,
    instanceURL,
    deviceId,
    deviceName,
    serialNumber,
  };
};

const createErrorResponse = (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
) => {
  return {
    res: false,
    instanceURL,
    deviceId,
    deviceName,
    serialNumber,
  };
};

export const updateDeviceStatusAPICall = async (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
  status,
) => {
  try {
    console.log(
      `${instanceURL}/cma_connect/api/status?device=${deviceName}&sr_no=${serialNumber}&status=${status}&device_id=${deviceId}`,
    );
    await axios.post(
      `${instanceURL}/cma_connect/api/status?device=${deviceName}&sr_no=${serialNumber}&status=${status}&device_id=${deviceId}`,
      undefined,
      config,
    );
  } catch (error) {}
};

export const switchConnetionModeAPICall = async (
  instanceURL,
  deviceId,
  isConnectWithBT,
) => {
  try {
    const responsePromise = axios.post(
      `${instanceURL}/cma_connect/api/switchConnetionMode?isConnectWithBT=${isConnectWithBT}&deviceId=${deviceId}`,
      undefined,
    );
    const response = await Promise.race([responsePromise, timeoutPromise]);
    console.log(
      `${instanceURL}/cma_connect/api/switchConnetionMode?isConnectWithBT=${isConnectWithBT}&deviceId=${deviceId}`,
    );
  } catch (error) {}
};
// get device list and licences details
export const getDeviceListAPICall = async (instanceURL, username, token) => {
  try {
    const res = await axios.get(
      `${instanceURL}/cma/licence/get_device_list?user=${username}`,
      config,
    );
    if (res.status == 200) {
      const devices = res.data?.device_dict;
      return { res: true, devices, error: null };
    }
    return { res: false, devices: [], error: 'Get device list request failed' };
  } catch (error) {
    return { res: false, devices: null, error: error?.message };
  }
};

export const getLicensesAPICall = async (instanceURL, token) => {
  try {
    const res = await axios.get(
      `${instanceURL}/cma/licence/get_licence_details`,
      config,
    );
    if (res.status == 200) {
      const licenses = res.data;
      return { res: true, licenses, error: null };
    }
    return { res: false, licenses: null, error: errorMsg };
  } catch (error) {
    return { res: false, licenses: null, error: error?.message };
  }
};

export const getToken = async ({ instanceURL, username, password }) => {
  console.log(
    'instanceURL, username, password',
    instanceURL,
    username,
    password,
  );
  try {
    const timeout = 3500; // 3.5 seconds in milliseconds

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
      signal: abortController.signal, // Pass the signal to axios request
    };
    console.log('requestConfig', requestConfig)

    const responsePromise = axios.post(
      `${instanceURL}/api/token_request`,
      undefined,
      requestConfig,
    );
    const response = await Promise.race([responsePromise, timeoutPromise]);
    console.log('response', response)

    console.log({ params: { user: username, pass: password } });

    if (response.data && response.status == 200) {
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
          error:
            'Unable to load token, verify your credentials and try again !',
        };
      }

      const parsedExpiry = Date.parse(tokenExpiry);
      const tokenExpiryTime = isNaN(parsedExpiry) ? null : parsedExpiry;

      return { res: true, token, tokenExpiry: tokenExpiryTime };
    }
    return {
      res: false,
      token: '',
      tokenExpiry: null,
      error: 'Unable to load token, verify your credentials and try again !',
    };
  } catch (error) {
    console.log(error);
    return {
      res: false,
      token: '',
      tokenExpiry: null,
      error:
        'Unable to load token, verify your credentials or network connection and try again!',
    };
  }
};

export const getDeviceInstanceLink = async (url) => {
  try {
    const res = await new Promise((resolve, reject) =>
      setTimeout(() => {
        resolve({
          status: 200,
          data: { status: 200, url },
        });
      }, 100),
    );
    if (res.status == 200) {
      if (res.data?.status == 200 && res.data?.url) {
        return { res: true, error: null, url: res.data?.url };
      }
      return { res: false, error: 'Error Getting Instance URL', url: null };
    }
    return { res: false, error: 'Error Getting Instance URL', url: null };
  } catch (error) {
    return { res: false, error: 'Error Getting Instance URL', url: null };
  }
};

export const login = async (hostUrl, email, password, token) => {
  try {
    const timeout = 3500; // 3.5 seconds in milliseconds
    const loginUrl = `${hostUrl}/cma_connect/api/login`;

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

    const responsePromise = axios.post(loginUrl, undefined, requestConfig);
    const response = await Promise.race([responsePromise, timeoutPromise]);

    if (response.status == 200) {
      const {
        status,
        web_socket_url: socketURL,
        error_message: errorMessage,
        colorgate_user: thirdPartyAPIUser,
      } = response.data;

      if (status == 200) {
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
  } catch (error) {
    return {
      res: false,
      error:
        'Unable to connect. Please verify your credentials or network connection and try again!',
    };
  }
};

export const colorGateAPIOLD = async () => {
  try {
    console.log('calling colorGATEAPI ====== ');
    const res = await axios.get('https://192.168.2.220:443/v1/queues/', {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Authorization: 'Basic Y21hOmNtYQ==',
      },
    });
    console.log({ data: res.data });
    console.log(res.data.status);
    console.log(res.data.queues);
    return res.data;
  } catch (error) {
    return null;
  }
};

const checkIfEmptyObject = (obj) => {
  if (obj && Object.getPrototypeOf(obj) === Object.prototype) {
    for (const property in obj) {
      return false;
    }
    return true;
  }
  return false;
};

// function to write/replace file
const writeFile = async (filename, content) => {
  try {
    await fsp.writeFile(filename, content);
    return { res: true, error: null };
  } catch (error) {
    console.log('permission denied');
    console.log(error.message);
    return { res: false, error: error.message };
  }
};

// function to read file
const readFile = async (filename) => {
  try {
    const data = await fsp.readFile(filename, { encoding: 'base64' });
    return { res: true, error: null, data };
  } catch (error) {
    console.log('permission denied');
    console.log(error.message);
    return { res: false, error: error.message, data: null };
  }
};

export const colorGateAPI = async (args) => {
  console.log('=== In colorGateAPI Function call ===');

  let data = null;
  let error = 'Unknown Error';

  try {
    // modify request object before calling api
    if (args.colorGateAPI?.type && args.colorGateAPI?.type == 'file') {
      // if request body type is file then convert into buffer before hitting to api
      try {
        const timeBeforeBuffer = Date.now();
        args.colorGateAPI.request.data = Buffer.from(
          args.colorGateAPI.request.data,
          'base64',
        );
        const timeAfterBuffer = Date.now();
        console.log(
          `time taken for converting buffer (in ms) : ${
            timeAfterBuffer - timeBeforeBuffer
          }`,
        );
      } catch (error) {
        // check if object empty nullify it
        data = checkIfEmptyObject(data) ? null : data;
        error = 'Error Converting file data into buffer';
        args.colorGateAPI.response = { data, error };
        return args;
      }
    }

    if (args.colorGateAPI?.type && args.colorGateAPI.type === 'file_replace') {
      // if request body type is file then convert into buffer before hitting to api
      try {
        // if file path is empty in case throw this message
        if (!args.colorGateAPI.request.fileName) {
          args.colorGateAPI.response = {
            data: null,
            hasReplaced: false,
            error: {
              message:
                'File-path is empty or not provided. please check CMA ColorPack on cma-connect',
            },
          };
          return args;
        }

        const timeBeforeBuffer = Date.now();
        args.colorGateAPI.request.data = Buffer.from(
          args.colorGateAPI.request.data,
          'base64',
        );
        const timeAfterBuffer = Date.now();
        console.log(
          `time taken for converting buffer (in ms) : ${
            timeAfterBuffer - timeBeforeBuffer
          }`,
        );

        const writeRes = await writeFile(
          args.colorGateAPI.request.fileName,
          args.colorGateAPI.request.data,
        );

        args.colorGateAPI.response = {
          data,
          hasReplaced: writeRes.res,
          error: { message: writeRes.error },
        };
        return args;
      } catch (error) {
        // check if object empty nullify it
        data = checkIfEmptyObject(data) ? null : data;
        error = 'Error Converting file data into buffer';
        args.colorGateAPI.response = { data, hasReplaced: false, error };
        return args;
      }
    }

    if (args.colorGateAPI?.type && args.colorGateAPI.type === 'get_file_data') {
      // if request body type is file then convert into buffer before hitting to api
      try {
        // if file path is empty in case throw this message
        if (!args.colorGateAPI.request.fileName) {
          args.colorGateAPI.response = {
            data: null,
            hasReplaced: false,
            error: {
              message:
                'File-path is empty or not provided. please check CMA ColorPack on cma-connect',
            },
          };
          return args;
        }

        const readRes = await readFile(args.colorGateAPI.request.fileName);

        args.colorGateAPI.response = {
          data: readRes.data,
          success: readRes.res,
          error: { message: readRes.error },
        };
        return args;
      } catch (error) {
        error = 'Error Reading file data';
        args.colorGateAPI.response = {
          data: null,
          success: false,
          error: { message: error.message },
        };
        return args;
      }
    }

    // calling api request
    const res = await axios(args.colorGateAPI.request);
    console.log('in colorGateAPI end ===');
    args.status = res.status;
    args.statusText = res.statusText;

    // change in request obj after response, to be send to websocket
    if (args.colorGateAPI?.type && args.colorGateAPI?.type == 'file') {
      args.colorGateAPI.request.data = 'encoded base64 string';
    }

    // on successful response from api
    if (res.data) {
      // update global data and error variable after success call
      data = res.data;
      error = null;

      // modified response obj before sending to websocket
      if (
        args.colorGateAPI?.type &&
        args.colorGateAPI?.type == 'binary_response_data' &&
        Buffer.isBuffer(data)
      ) {
        // in case response is binary string on successful request
        try {
          data = Buffer.from(data, 'binary').toString('base64');
        } catch (error) {
          error = 'Error converting data/image response to base64';
        }
      }
    }

    // check if object empty nullify it
    data = checkIfEmptyObject(data) ? null : data;
    args.colorGateAPI.response = { data, error };
    return args;
  } catch (err) {
    console.log({ err });
    console.log({ message: err.message });

    // change in request obj after response, to be send to websocket
    if (args.colorGateAPI?.type && args.colorGateAPI?.type == 'file') {
      args.colorGateAPI.request.data = 'encoded base64 string';
    }

    if (err.response) {
      // check if get err response for err description
      const { status, statusText } = err.response;
      args.status = status;
      args.statusText = statusText ?? 'Failed';
      if (err.response.data) {
        if (args.colorGateAPI.type == 'binary_response_data') {
          data = JSON.parse(err.response.data);
        } else {
          data = err.response.data;
        }
      }
    } else if (err?.message.includes('ECONNREFUSED')) {
      // check if connection refused, update statusText
      args.statusText = 'ECONNREFUSED : Server Error';
    } else {
      args.statusText = err.message ?? 'Failed';
    }

    // check if object empty nullify it
    data = checkIfEmptyObject(data) ? null : data;
    error = args.statusText ?? error;
    args.colorGateAPI.response = { data, error };
    return args;
  }
};

export const alwanAPI = async (args) => {
  console.log('=== In alwanAPI Function call ===');

  let data = null;
  let error = 'Unknown Error';

  try {
    // modify request object before calling api
    if (args.alwanAPI?.type && args.alwanAPI?.type == 'file') {
      // if request body type is file then convert into buffer before hitting to api
      try {
        const timeBeforeBuffer = Date.now();
        const fileBuffer = Buffer.from(args.alwanAPI.request.data, 'base64');
        const formData = new FormData();
        formData.append('', fileBuffer, { filename: args.alwanAPI.filename });
        args.alwanAPI.request.data = formData;
        const timeAfterBuffer = Date.now();
        console.log(
          `time taken for converting buffer (in ms) : ${
            timeAfterBuffer - timeBeforeBuffer
          }`,
        );
        args.alwanAPI.request.headers = {
          ...args.alwanAPI.request.headers,
          ...formData.getHeaders(),
        };
      } catch (error) {
        // check if object empty nullify it
        data = checkIfEmptyObject(data) ? null : data;
        error = 'Error Converting file data into readable stream';
        args.alwanAPI.response = { data, error };
        return args;
      }
    }

    // calling api request
    const res = await axios(args.alwanAPI.request);
    console.log('in alwanAPI end ===');
    args.status = res.status;
    args.statusText = res.statusText;

    // change in request obj after response, to be send to websocket
    if (args.alwanAPI?.type && args.alwanAPI?.type == 'file') {
      args.alwanAPI.request.data = 'encoded base64 string';
    }

    // on successful response from api
    if (res.data) {
      // update global data and error variable after success call
      data = res.data;
      error = null;

      // modified response obj before sending to websocket
      if (
        args.alwanAPI?.type &&
        args.alwanAPI?.type == 'binary_response_data' &&
        Buffer.isBuffer(data)
      ) {
        // in case response is binary string on successful request
        try {
          data = Buffer.from(data, 'binary').toString('base64');
        } catch (error) {
          error = 'Error converting data/image response to base64';
        }
      }
    }

    // check if object empty nullify it
    data = checkIfEmptyObject(data) ? null : data;
    args.alwanAPI.response = { data, error };
    return args;
  } catch (err) {
    console.log({ err });
    console.log({ message: err.message });

    // change in request obj after response, to be send to websocket
    if (args.alwanAPI?.type && args.alwanAPI?.type == 'file') {
      args.alwanAPI.request.data = 'encoded base64 string';
    }

    if (err.response) {
      // check if get err response for err description
      const { status, statusText } = err.response;
      args.status = status;
      args.statusText = statusText ?? 'Failed';
      if (err.response.data) {
        if (args.alwanAPI.type == 'binary_response_data') {
          data = JSON.parse(err.response.data);
        } else {
          data = err.response.data;
        }
      }
    } else if (err?.message.includes('ECONNREFUSED')) {
      // check if connection refused, update statusText
      args.statusText = 'ECONNREFUSED : Server Error';
    } else {
      args.statusText = err.message ?? 'Failed';
    }

    // check if object empty nullify it
    data = checkIfEmptyObject(data) ? null : data;
    error = args.statusText ?? error;
    args.alwanAPI.response = { data, error };
    return args;
  }
};

// function for api call to deactivate colorGate user
export const updateColorGateUserStatusAPICall = async (
  instanceURL,
  status,
  licence,
  licenceUpdate,
) => {
  try {
    console.log(
      ` === update colorGate user status ${instanceURL} ${status} ${licence} ${licenceUpdate} ====`,
    );
    const url = licenceUpdate
      ? `${instanceURL}/cma_connect/api/colorgate/status?status=${status}&licence=${licence}&licence_update=${licenceUpdate}`
      : `${instanceURL}/cma_connect/api/colorgate/status?status=${status}&licence=${licence}`;
    const res = await axios.post(url);
    console.log(res.status);
    if (res.status == 200) {
      const status = res.data?.status;
      const errorMessage = res.data?.error_message;
      if (status == 200) {
        console.log(
          `==== update colorGate user status ${instanceURL} ${status} ${licence} api success ====`,
        );
        return { result: true, error: null };
      }
      console.log(
        `==== update colorGate user status ${instanceURL} ${status} ${licence} api failed ====`,
      );
      return {
        result: false,
        error:
          errorMessage ?? status == 'disconnect'
            ? 'Deactivating third party licence failed'
            : 'Activating third party licence failed',
      };
    }
    return {
      result: false,
      error:
        status == 'disconnect'
          ? 'Deactivating third party licence failed'
          : 'Activating third party licence failed',
    };
  } catch (error) {
    console.log(error?.message);
    console.log(
      `=== update colorGate user status ${instanceURL} ${status} ${licence} api error ===`,
    );
    return { result: false, error: error?.message };
  }
};

// function for api call to deactivate alwan user
export const updateAlwanUserStatusAPICall = async (
  instanceURL,
  status,
  licence,
  licenceUpdate,
) => {
  try {
    console.log(
      ` === update alwan user status ${instanceURL} ${status} ${licence} ${licenceUpdate} ====`,
    );
    const url = licenceUpdate
      ? `${instanceURL}/cma_connect/api/alwan/status?status=${status}&licence=${licence}&licence_update=${licenceUpdate}`
      : `${instanceURL}/cma_connect/api/alwan/status?status=${status}&licence=${licence}`;
    const res = await axios.post(url);
    console.log(res.status);
    if (res.status == 200) {
      const status = res.data?.status;
      const errorMessage = res.data?.error_message;
      if (status == 200) {
        console.log(
          `==== update alwan user status ${instanceURL} ${status} ${licence} api success ====`,
        );
        return { result: true, error: null };
      }
      console.log(
        `==== update alwan user status ${instanceURL} ${status} ${licence} api failed ====`,
      );
      return {
        result: false,
        error:
          errorMessage ?? status == 'disconnect'
            ? 'Deactivating third party licence failed'
            : 'Activating third party licence failed',
      };
    }
    return {
      result: false,
      error:
        status == 'disconnect'
          ? 'Deactivating third party licence failed'
          : 'Activating third party licence failed',
    };
  } catch (error) {
    console.log(error?.message);
    console.log(
      `=== update alwan user status ${instanceURL} ${status} ${licence} api error ===`,
    );
    return { result: false, error: error?.message };
  }
};
