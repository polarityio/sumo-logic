const async = require('async');
const gaxios = require('gaxios');
const fs = require('fs');
const https = require('https');
const config = require('./config/config');
const gaxiosErrorToPojo = require('./utils/errorToPojo');

const entityTemplateReplacementRegex = /{{entity}}/g;
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
    }
  };
};

const doLookup = async (entities, options, cb) => {
  let lookupResults;

  requestDefaults(options);

  try {
    lookupResults = await async.parallelLimit(
      entities.map((entity) => async () => {
        const lookupResult = await getJobMessages(entity, options);
        return lookupResult;
      }),
      10
    );
  } catch (err) {
    const handledError = gaxiosErrorToPojo(err);
    Logger.error({ err: handledError }, 'Lookup Error');
    return cb(handledError);
  }

  Logger.trace({ lookupResults }, 'lookupResults');
  return cb(null, lookupResults);
};

const createJob = async (entity, options) => {
  const query = options.query.replace(entityTemplateReplacementRegex, entity.value);
  const job = await gaxios.request({
    method: 'POST',
    url: `https://api.us2.sumologic.com/api/v1/search/jobs/asds`,
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
      Logger.trace({ ERR: err });
      throw err;
    }
  });

  if (createdJobId) {
    results = await gaxios.request({
      method: 'GET',
      url: `https://api.us2.sumologic.com/api/v1/search/jobs/${createdJobId.jobId}/messages?offset=0&limit=10`
    });
  }
  return {
    entity,
    data:
      Object.keys(results.data).length > 0
        ? { summary: getSummary(results.data), details: results.data }
        : null
  };
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
  getCreatedJobId,
  validateOptions
};
