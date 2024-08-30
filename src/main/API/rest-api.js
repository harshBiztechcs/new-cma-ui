/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-ex-assign */
/* eslint-disable no-console */
import axios from 'axios';
import https from 'https';
import fs from 'fs/promises';
import { Buffer } from 'buffer';

const config = new https.Agent({ rejectUnauthorized: false });

const createSuccessResponse = () => {
  return { result: true, error: null };
};

const createErrorResponse = (error) => {
  return { result: false, error };
};

export const updateColorGateUserStatusAPICall = async ({
  instanceURL,
  status,
  licence,
  licenceUpdate,
}) => {
  try {
    const url = licenceUpdate
      ? `${instanceURL}/cma_connect/api/colorgate/status?status=${status}&licence=${licence}&licence_update=${licenceUpdate}`
      : `${instanceURL}/cma_connect/api/colorgate/status?status=${status}&licence=${licence}`;
    const response = await axios.post(url, undefined, config);
    if (response.status === 200) {
      const { status: statusCode, error_message: errorMessage } = response.data;
      if (statusCode === 200) {
        return createSuccessResponse();
      }
      return createErrorResponse(
        (errorMessage ?? status === 'disconnect')
          ? 'Deactivating third party licence failed'
          : 'Activating third party licence failed',
      );
    }
    return createErrorResponse(
      status === 'disconnect'
        ? 'Deactivating third party licence failed'
        : 'Activating third party licence failed',
    );
  } catch (error) {
    console.log(error?.message);
    return createErrorResponse(error?.message);
  }
};

export const updateAlwanUserStatusAPICall = async ({
  instanceURL,
  status,
  licence,
  licenceUpdate,
}) => {
  try {
    const url = licenceUpdate
      ? `${instanceURL}/cma_connect/api/alwan/status?status=${status}&licence=${licence}&licence_update=${licenceUpdate}`
      : `${instanceURL}/cma_connect/api/alwan/status?status=${status}&licence=${licence}`;
    const response = await axios.post(url, undefined, config);
    if (response.status === 200) {
      const { status: statusCode, error_message: errorMessage } = response.data;
      if (statusCode === 200) {
        return createSuccessResponse();
      }
      return createErrorResponse(
        (errorMessage ?? status === 'disconnect')
          ? 'Deactivating third party licence failed'
          : 'Activating third party licence failed',
      );
    }
    return createErrorResponse(
      status === 'disconnect'
        ? 'Deactivating third party licence failed'
        : 'Activating third party licence failed',
    );
  } catch (error) {
    console.log(error?.message);
    return createErrorResponse(error?.message);
  }
};

const checkIfEmptyObject = (obj) => {
  return (
    obj &&
    typeof obj === 'object' &&
    Object.getPrototypeOf(obj) === Object.prototype &&
    Object.keys(obj).length === 0
  );
};
export const alwanAPI = async (args) => {
  console.log('=== In alwanAPI Function call ===');

  let data = null;
  let error = 'Unknown Error';

  try {
    if (args.alwanAPI?.type === 'file') {
      try {
        const timeBeforeBuffer = Date.now();
        const fileBuffer = Buffer.from(args.alwanAPI.request.data, 'base64');
        const formData = new FormData();
        formData.append('', fileBuffer, { filename: args.alwanAPI.filename });
        args.alwanAPI.request.data = formData;
        args.alwanAPI.request.headers = {
          ...args.alwanAPI.request.headers,
          ...formData.getHeaders(),
        };
        const timeAfterBuffer = Date.now();
        console.log(
          `time taken for converting buffer (in ms) : ${timeAfterBuffer - timeBeforeBuffer}`,
        );
      } catch (error) {
        data = checkIfEmptyObject(data) ? null : data;
        error = 'Error Converting file data into readable stream';
        args.alwanAPI.response = { data, error };
        return args;
      }
    }

    const res = await axios(args.alwanAPI.request);
    console.log('in alwanAPI end ===');
    args.status = res.status;
    args.statusText = res.statusText;

    if (args.alwanAPI?.type === 'file') {
      args.alwanAPI.request.data = 'encoded base64 string';
    }

    if (res.data) {
      data = res.data;
      error = null;

      if (
        args.alwanAPI?.type === 'binary_response_data' &&
        Buffer.isBuffer(data)
      ) {
        try {
          data = Buffer.from(data, 'binary').toString('base64');
        } catch (error) {
          error = 'Error converting data/image response to base64';
        }
      }
    }

    data = checkIfEmptyObject(data) ? null : data;
    args.alwanAPI.response = { data, error };
    return args;
  } catch (err) {
    console.log({ err });
    console.log({ message: err.message });

    if (args.alwanAPI?.type === 'file') {
      args.alwanAPI.request.data = 'encoded base64 string';
    }

    if (err.response) {
      const { status, statusText } = err.response;
      args.status = status;
      args.statusText = statusText ?? 'Failed';
      if (err.response.data) {
        if (args.alwanAPI.type === 'binary_response_data') {
          data = JSON.parse(err.response.data);
        } else {
          data = err.response.data;
        }
      }
    } else if (err?.message.includes('ECONNREFUSED')) {
      args.statusText = 'ECONNREFUSED : Server Error';
    } else {
      args.statusText = err.message ?? 'Failed';
    }

    data = checkIfEmptyObject(data) ? null : data;
    error = args.statusText ?? error;
    args.alwanAPI.response = { data, error };
    return args;
  }
};

const writeFile = async (filename, content) => {
  try {
    await fs.writeFile(filename, content);
    return { res: true, error: null };
  } catch (error) {
    console.log('permission denied');
    console.log(error.message);
    return { res: false, error: error.message };
  }
};

const readFile = async (filename) => {
  try {
    const data = await fs.readFile(filename, { encoding: 'base64' });
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
    if (args.colorGateAPI?.type === 'file') {
      args.colorGateAPI.request.data = Buffer.from(
        args.colorGateAPI.request.data,
        'base64',
      );
    }

    if (args.colorGateAPI?.type === 'file_replace') {
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
    }

    if (args.colorGateAPI?.type === 'get_file_data') {
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
    }

    const res = await axios(args.colorGateAPI.request);
    console.log('in colorGateAPI end ===');
    args.status = res.status;
    args.statusText = res.statusText;

    if (args.colorGateAPI?.type === 'file') {
      args.colorGateAPI.request.data = 'encoded base64 string';
    }

    if (res.data) {
      data = res.data;
      error = null;

      if (
        args.colorGateAPI?.type === 'binary_response_data' &&
        Buffer.isBuffer(data)
      ) {
        data = Buffer.from(data, 'binary').toString('base64');
      }
    }

    data = checkIfEmptyObject(data) ? null : data;
    args.colorGateAPI.response = { data, error };
    return args;
  } catch (err) {
    console.log({ err });
    console.log({ message: err.message });

    if (args.colorGateAPI?.type === 'file') {
      args.colorGateAPI.request.data = 'encoded base64 string';
    }

    if (err.response) {
      const { status, statusText } = err.response;
      args.status = status;
      args.statusText = statusText ?? 'Failed';
      if (err.response.data) {
        if (args.colorGateAPI.type === 'binary_response_data') {
          data = JSON.parse(err.response.data);
        } else {
          data = err.response.data;
        }
      }
    } else if (err?.message.includes('ECONNREFUSED')) {
      args.statusText = 'ECONNREFUSED : Server Error';
    } else {
      args.statusText = err.message ?? 'Failed';
    }

    data = checkIfEmptyObject(data) ? null : data;
    error = args.statusText ?? error;
    args.colorGateAPI.response = { data, error };
    return args;
  }
};
