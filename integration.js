const gaxios = require('gaxios');
const fs = require('fs');
const https = require('https');
const config = require('./config/config');
const errorToPojo = require('./utils/errorToPojo');
const Bottleneck = require('bottleneck');
const { create } = require('domain');

const entityTemplateReplacementRegex = /{{entity}}/g;
const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;

let Logger;
let limiter;

function startup(logger) {
  Logger = logger;
  /* 
    - rate limit of four API requests per second (240 requests per minute) applies to all API calls from a user.
    - rate limit of 10 concurrent requests to any API endpoint applies to an access key.
  */
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
    }
  };
};

const doLookup = async (entities, options, cb) => {
  requestDefaults(options);

  limiter = new Bottleneck({
    maxConcurrent: 1,
    minTime: 240,
    highWater: 6,
    strategy: Bottleneck.strategy.OVERFLOW
  });

  entities.forEach((entity) => {
    limiter.submit(getJobMessages, entity, options, (err, result) => {
      if (err) {
        const handledError = handleError(err);
        return cb(null, handledError);
      } else {
        return cb(null, result);
      }
    });
  });
};

const createJob = async (entity, options) => {
  const query = options.query.replace(entityTemplateReplacementRegex, entity.value);
  const job = await gaxios.request({
    method: 'POST',
    url: `https://api.us2.sumologic.com/api/v1/search/jobs`,
    data: JSON.stringify({
      query,
      from: options.from,
      to: options.to,
      timeZone: options.timeZone,
      byReceiptTime: true
    })
  });
  return job;
};

const getCreatedJobId = async (entity, options) => {
  let result;

  try {
    const job = await createJob(entity, options).catch((err) => {
      if (err) {
        throw err;
      }
    });

    const getJobResults = async () => {
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
        return getJobResults();
      }
    };

    return getJobResults();
  } catch (err) {
    throw err;
  }
};

const getJobMessages = async (entity, options, callback) => {
  let results;

  const createdJobId = await getCreatedJobId(entity, options).catch((err) => {
    if (err) {
      throw err;
    }
  });

  if (createdJobId) {
    results = await gaxios.request({
      method: 'GET',
      url: `https://api.us2.sumologic.com/api/v1/search/jobs/${createdJobId.jobId}/messages?offset=0&limit=10`
    });
  }

  return callback(null, [
    { entity, data: { summary: getSummary(results.data), details: results.data } }
  ]);
};

const handleError = async (err) => {
  switch (err) {
    case 405:
      return {
        err,
        detail: err.message
      };
    case 404:
      return {
        err,
        detail: err.message
      };
    case 401: {
      return {
        err,
        detail: err.message
      };
    }
    case 400: {
      return {
        err,
        detail: err.message
      };
    }
  }
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
  validateOption(
    errors,
    options,
    'byReceiptTime',
    'You must provide a valid byReceiptTime.'
  );

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
  handleError,
  getCreatedJobId,
  validateOptions
};
