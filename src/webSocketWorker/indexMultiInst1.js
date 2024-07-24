const { decJObj, encJObj } = require('./crypto');
const { connection, auth } = require('./data');
const {
  onConnectSocketMultiInstance1,
  ipcColorGateServerConnectionRes,
  ipcSendColorGateAPIReq,
  ipcColorGateConnectionCheck,
  onDisconnectSocketMultiInstance1,
  onColorGateServerConnectionReqMultiInstance1,
  onColorGateConnectionCheckMultiInstance1,
  onColorGateApiResMultiInstance1,
  ipcClientSocketAlreadyExist,
  ipcClientSocketAlreadyExistInstance1,
  ipcConnectionStatusInstance1,
} = require('./ipcRendererCall');

let socket = null;
let colorGateSocketConnection = false;
let clientAlreadyAvailable = false;

const connectSocket = (url, auth) => {
  console.log('🚀 ~ file: index.js:90 ~ connectSocket ~ auth:', auth);
  console.log(
    '🚀 ~ file: indexMultiInst.js:67 ~ connectSocket ~ socket:',
    socket
  );
  if (socket) return;
  clientAlreadyAvailable = false;
  const config = {
    headers: {
      username: auth.username,
      instance_url: auth.instanceURL,
      token: auth.token,
    },
  };
  socket = new WebSocket(url);
  socket.onopen = () => {
    ipcConnectionStatusInstance1('connected')
    console.log('connected', url, 'webSocket');
  };

  socket.onmessage = ({ data }) => {
    console.log('🚀 ~ connectSocket ~ data:', data);
    try {
      const res = JSON.parse(data);
      if (res?.error) {
        console.log(
          '🚀 ~ file: indexMultiInst.js:42 ~ connectSocket ~ res?.error:',
          res?.error
        );
        // ipcCurrentAction(res.error);
        // ipcShowDialog('Error', res.error ?? 'Unknown Error');
        return;
      }
    } catch (error) {}
    const decRes = decryptMsg(socket, data);
    console.log('🚀 ~ connectSocket ~ decRgergrtetres:', decRes);
    if (
      decRes.message?.error?.message &&
      decRes.message?.error?.message ==
        'Requested CMA-connect client is already available'
    ) {
      clientAlreadyAvailable = true;
      console.log('Requested CMA-connect client is already available 0123456798');
      ipcClientSocketAlreadyExistInstance1(true);
    }
    if (!decRes.success) return;
    handleResponse(decRes.message);
  };

  socket.onerror = (error) => {
    console.log('🚀 ~ file: index.js:131 ~ connectSocket ~ error:', error);
    socket = null;
  };

  socket.onclose = (event) => {
    console.log('🚀 ~ file: index.js:143 ~ connectSocket ~ event:', event);
    socket = null;
  };
};

onConnectSocketMultiInstance1(
  (event, { username, instanceURL, token, socketURL, forceConnect }) => {
    connection.connection.forceConnect = forceConnect;
    connectSocket(socketURL, { username, instanceURL, token });
    auth.username = username;
    auth.instanceURL = instanceURL;
  }
);

onDisconnectSocketMultiInstance1((event) => {
  console.log(
    '🚀 ~ file: indexMultiInst.js:80 ~ onDisconnectSocketMultiInstance1 ~ event:'
  );
  socket.close();
});

// sends back to client if failed
const decryptMsg = (socket, content) => {
  const res = decJObj(content);
  if (!res.success) {
    // ipcCurrentAction(res.message);
  }
  return res;
};

const handleResponse = (msg) => {
  console.log('🚀 ~ handleResponse ~ msg:', msg);
  if (msg?.error) {
    console.log(
      '🚀 ~ file: indexMultiInst.js:98 ~ handleResponse ~ msg?.error:',
      msg?.error
    );
    // ipcCurrentAction(msg.error?.message);
    // ipcShowDialog('Error', msg.error?.message ?? 'Unknown Error');
    return;
  }
  switch (msg?.type) {
    case 'connection':
      handleConnectionResponse(msg);
      break;

    case 'colorGateAPI':
      handleColorGateAPIRequest(msg);
      break;

    case 'colorGateServerConnection':
      handleColorGateServerConnectionResponse(msg);
      break;

    case 'colorGateConnectionCheck':
      handleColorGateConnectionCheck(msg);
      break;

    default:
      break;
  }
};

const handleConnectionResponse = (msg) => {
  console.log("🚀 ~ handleConnectionResponse ~ msg:", msg)
  if (msg.connection.isConnected && !msg.connection?.isVerified) {
    console.log('verifying');
    auth.id = msg.connection.id;
    connection.connection.isConnected = true;
    const obj = { auth, content: connection };
    // socket.send(encJObj(obj));
    let a = sendEncryptMsg(socket, obj);
    console.log("🚀 ~ handleConnectionResponse ~ a:", a)
  }
  if (msg.connection.isConnected && msg.connection.isVerified) {
    connection.connection.isVerified = true;
    console.log('verified');
  }
};

const handleColorGateAPIRequest = (msg) => {
  console.log('==== Received ColorGate API Request ====');
  ipcSendColorGateAPIReq(msg);
};

const handleColorGateServerConnectionResponse = (msg) => {
  if (msg?.colorGateServerConnection?.isConnected) {
    colorGateSocketConnection = true;
  } else {
    colorGateSocketConnection = false;
  }
  ipcColorGateServerConnectionRes(msg);
};

const handleColorGateConnectionCheck = (msg) => {
  ipcColorGateConnectionCheck(msg);
};

// sends client encrypted msg / error string
const sendEncryptMsg = (socket, content) => {
    const res = encJObj(content);
    if (res.success) {
      socket.send(Buffer.from(res.message));
    } else {
      console.log(res.message);
    }
    return res.success;
  };

  onColorGateServerConnectionReqMultiInstance1((event, args) => {
    console.log("🚀 ~ file: indexMultiInst.js:180 ~ onColorGateServerConnectionReqMultiInstance1 ~ args:", args)
    if (args?.isConnected == !colorGateSocketConnection) return;
    if (!args.colorGateLicense) return;
    console.log('onColorGateServerConnectionReqMultiInstance1 === ');
    const obj = {
      auth: { ...auth, licence: args.colorGateLicense },
      content: {
        type: 'colorGateServerConnection',
        colorGateServerConnection: {
          isConnected: args?.isConnected,
        },
      },
    };
    console.log('sending to websocket == ');
    console.log(obj);
    sendEncryptMsg(socket, obj);
  });

  onColorGateConnectionCheckMultiInstance1((event, args) => {
    console.log("🚀 ~ file: indexMultiInst.js:205 ~ onColorGateConnectionCheckMultiInstance1 ~ args:", args)
    const obj = { auth, content: args };
    console.log(' ==== sending to ColorGate Response to websocket ==== ');
    sendEncryptMsg(socket, obj);
  });

  onColorGateApiResMultiInstance1((event, args) => {
    const obj = { auth, content: args };
    console.log(' ==== sending to ColorGate Response to websocket ==== ');
    sendEncryptMsg(socket, obj);
  });

