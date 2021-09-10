const { GaxiosError } = require('gaxios');

function getData(err) {
  if (err.response && err.response.data) {
    return err.response.data;
  }
  return {};
}

function getDetail(err) {
  if (err.response && err.response.data && err.response.data.message) {
    return err.response.data.message;
  } else if (err.response && err.response.status === 503) {
    return `Lookup limit reached.  Please wait a moment and try searching fewer indicators.`;
  } else if (err.response) {
    return `Received unexpected HTTP status ${err.response.status}`;
  } else if (err.request) {
    return `There was an HTTP error`;
  } else {
    return 'There was an unexpected error';
  }
}

function gaxiosErrorToPojo(err) {
  if (err instanceof GaxiosError) {
    return {
      name: err.name,
      message: err.message,
      request: err.request,
      data: getData(err),
      detail: getDetail(err)
    };
  } else if (err instanceof Error) {
    // Handle Node Errors as well as FetchError
    // See https://github.com/node-fetch/node-fetch/blob/master/docs/ERROR-HANDLING.md for information
    // on Node Fetch error structure
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      errno: err.errno,
      type: err.type,
      detail: err.message ? err.message : 'There was an unexpected error'
    };
  } else {
    return err;
  }
}

module.exports = gaxiosErrorToPojo;
