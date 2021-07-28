const gaxios = require('gaxios');
const fs = require('fs');
const https = require('https');
const config = require('./config/config');
const errorToPojo = require('./utils/errorToPojo');

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;
let Logger;

function startup(logger) {
  Logger = logger;
}

const requestDefaults = (options) => {
  const {
    request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
  } = config;

  const httpsAgent = new https.Agent({
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase }),
    ...(typeof rejectUnauthorized === 'boolean' && { rejectUnauthorized })
  });

  if (_configFieldIsValid(proxy)) {
    process.env.HTTP_PROXY = proxy;
    process.env.HTTPS_PROXY = proxy;
  }

  gaxios.instance.defaults = {
    agent: httpsAgent,
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(options.accessId + ':' + options.accessKey).toString('base64'),
      'Content-type': 'application/json'
    },
    retryConfig: {
      retry: 6,
      httpMethodsToRetry: ['GET', 'POST'],
      retryDelay: 1000
    },
    ...(_configFieldIsValid(proxy) && { proxy: { host: proxy } })
  };
};

const doLookup = async (entities, options, cb) => {
  let lookupResults;

  requestDefaults(options);

  try {
    entities.map(async (entity) => {
      lookupResults = await getJobMessages(entity, options);
    });
  } catch (err) {
    Logger.error({ err }, 'Get Lookup Results Failed');
    let detailMsg = 'There was an unexpected error';

    if (err.response) {
      detailMsg = `Received unexpected HTTP status ${err.response.status}`;
    } else if (err.request) {
      detailMsg = `There was an HTTP err`;
    } else {
      detailMsg = err.message;
    }
    return cb(errorToPojo('err', err));
  }

  const getResults = async () => {
    if (lookupResults) {
      Logger.trace({ lookupResults }, 'lookupResults');
      return cb(null, lookupResults);
    } else {
      await sleep(1000);
      return getResults();
    }
  };

  return getResults();
};

// const onMessage = async (payload, options, cb) => {
//   if (payload.type === 'makeRequest') {
//     return cb(null, {
//       reply: 'asds'
//     })
//   } else {
//     return cb(null, {})
//   }
// }

const createJob = async (entity, options) => {
  let result;

  result = await gaxios.request({
    method: 'POST',
    url: `https://api.us2.sumologic.com/api/v1/search/jobs`,
    data: JSON.stringify({
      query: `_sourceName =* and ` + `${entity.value}`, // query will find instances of entity in log messages
      from: options.from,
      to: options.to,
      timeZone: options.timeZone,
      byReceiptTime: true
    })
  });

  return result;
};

const getCreatedJobId = async (entity, options) => {
  let result;
  const job = await createJob(entity, options);

  const makeRequest = async () => {
    result = await gaxios.request({
      method: 'GET',
      url: `https://api.us2.sumologic.com/api/v1/search/jobs/${job.data.id}`
    });

    if (result.data.state === 'DONE GATHERING RESULTS') {
      return {
        jobId: job.data.id
      };
    } else {
      await sleep(1000);
      return makeRequest();
    }
  };
  return makeRequest();
};

const getJobMessages = async (entity, options) => {
  const createdJobId = await getCreatedJobId(entity, options);

  results = await gaxios.request({
    method: 'GET',
    url: `https://api.us2.sumologic.com/api/v1/search/jobs/${createdJobId.jobId}/messages?offset=0&limit=10`
  });

  return [
    {
      entity,
      data: { summary: getSummary(results.data), details: [results.data] }
    }
  ];
};

function getSummary(data) {
  let tags = [];

  if (Object.keys(data).length > 0) {
    const totalMessages = data.messages.length;
    tags.push(`Messages: ${totalMessages}`);
  }

  if (Object.keys(data).length > 0) {
    data.messages.map((message) => {
      tags.push(`_Source: ${message.map._source}`);
    });
  }
  return tags;
}

function validateOption(errors, options, optionName, errMessage) {
  if (
    typeof options[optionName].value !== 'string' ||
    (typeof options[optionName].value === 'string' &&
      options[optionName].value.length === 0)
  ) {
    errors.push({
      key: optionName,
      message: errMessage
    });
  }
}

function validateOptions(options, callback) {
  let errors = [];

  validateOption(errors, options, 'accessId', 'You must provide a valid accessId.');
  validateOption(errors, options, 'accessKey', 'You must provide a valid accessKey.');
  validateOption(errors, options, 'from', 'You must provide a date range.');
  validateOption(errors, options, 'to', 'You must provide a date range.');
  validateOption(errors, options, 'timeZone', 'You must provide a valid timezone.');
  validateOption(errors, options, 'byReceiptTime', 'You must provide a valid Password.');

  callback(null, errors);
}

const sleep = async (time) =>
  new Promise((res, rej) => {
    setTimeout(() => res(), time);
  });

module.exports = {
  doLookup,
  startup,
  createJob,
  getCreatedJobId,
  validateOptions
};
