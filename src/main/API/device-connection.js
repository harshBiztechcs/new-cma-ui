/* eslint-disable promise/param-names */
/* eslint-disable no-console */
import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const createSuccessResponse = (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
) => ({
  res: true,
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
});

const createErrorResponse = (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
) => ({
  res: false,
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
});

export const clientDeviceReconnectAPICall = async ({
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
}) => {
  try {
    const response = await axios.post(
      `${instanceURL}/cma_connect/api/reconnect?device=${deviceName}&sr_no=${serialNumber}&device_id=${deviceId}`,
      undefined,
      { httpsAgent },
    );
    return response.data;
  } catch (error) {
    const errorMessage = `Error reconnecting device: ${error.message}`;
    console.error(errorMessage);
    return createErrorResponse(instanceURL, deviceId, deviceName, serialNumber);
  }
};

export const clientDeviceDisconnectAPICall = async ({
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
}) => {
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
      httpsAgent,
      signal: abortController.signal,
    };

    const endpoint = `${instanceURL}/cma_connect/api/disconnect?device=${deviceName}&sr_no=${serialNumber}&device_id=${deviceId}`;

    const responsePromise = axios.post(endpoint, undefined, requestConfig);
    const response = await Promise.race([responsePromise, timeoutPromise]);

    if (response?.data?.status === 200) {
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

export const updateDeviceStatusAPICall = async (
  instanceURL,
  deviceId,
  deviceName,
  serialNumber,
  status,
) => {
  try {
    const endpoint = `${instanceURL}/cma_connect/api/status?device=${deviceName}&sr_no=${serialNumber}&status=${status}&device_id=${deviceId}`;
    console.log(`Request URL: ${endpoint}`);
    await axios.post(endpoint, undefined, { httpsAgent });
  } catch (error) {
    const errorMessage = `Error updating device status: ${error.message}`;
    console.error(errorMessage);
  }
};

export const switchConnectionModeAPICall = async (
  instanceURL,
  deviceId,
  isConnectWithBT,
) => {
  try {
    const timeout = 5000;
    const abortController = new AbortController();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        abortController.abort();
        reject(new Error('Request timed out'));
      }, timeout);
    });

    const requestConfig = {
      httpsAgent,
      signal: abortController.signal,
    };

    const endpoint = `${instanceURL}/cma_connect/api/switchConnectionMode?isConnectWithBT=${isConnectWithBT}&deviceId=${deviceId}`;
    const responsePromise = axios.post(endpoint, undefined, requestConfig);
    await Promise.race([responsePromise, timeoutPromise]);

    console.log(`Request URL: ${endpoint}`);
  } catch (error) {
    const errorHeading = 'Switch Connection Mode Error:';
    const errorMessage = `${errorHeading} Failed to switch connection mode for device ID ${deviceId}. Error: ${error.message}`;
    console.error(errorMessage);
  }
};

export const getDeviceListAPICall = async (instanceURL, username) => {
  try {
    const res = await axios.get(
      `${instanceURL}/cma/licence/get_device_list?user=${username}`,
      { httpsAgent },
    );
    if (res.status === 200) {
      const devices = res.data?.device_dict;
      return { res: true, devices, error: null };
    }
    return { res: false, devices: [], error: 'Get device list request failed' };
  } catch (error) {
    return { res: false, devices: null, error: error.message };
  }
};

export const getLicensesAPICall = async (instanceURL) => {
  try {
    const res = await axios.get(
      `${instanceURL}/cma/licence/get_licence_details`,
      { httpsAgent },
    );
    if (res.status === 200) {
      const licenses = res.data;
      return { res: true, licenses, error: null };
    }
    return {
      res: false,
      licenses: null,
      error: 'Get license details request failed',
    };
  } catch (error) {
    return { res: false, licenses: null, error: error.message };
  }
};

export const getDeviceInstanceLink = async (url) => {
  try {
    const res = await new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 200,
          data: { status: 200, url },
        });
      }, 100);
    });
    if (res.status === 200 && res.data?.status === 200 && res.data?.url) {
      return { res: true, error: null, url: res.data.url };
    }
    return { res: false, error: 'Error getting instance URL', url: null };
  } catch (error) {
    return { res: false, error: 'Error getting instance URL', url: null };
  }
};
