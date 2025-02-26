const async = require('async');
const gaxios = require('gaxios');
const fs = require('fs');
const https = require('https');
const config = require('./config/config');
const gaxiosErrorToPojo = require('./utils/errorToPojo');
const { formatISO, subDays, subWeeks, subMonths, subYears } = require('date-fns');

const entityTemplateReplacementRegex = /{{entity}}/gi;
const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;
const MAX_TAGS = 3;
let Logger;
let httpsAgent;

function startup(logger) {
  const {
    request: { ca, cert, key, passphrase, proxy }
  } = config;

  Logger = logger;

  if (_configFieldIsValid(proxy)) {
    process.env.HTTP_PROXY = proxy;
    process.env.HTTPS_PROXY = proxy;
  }

  httpsAgent = new https.Agent({
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase })
  });
}

const getStartDate = (options) => {
  let currentDate = new Date();
  let range;
  switch (options.timeRange.value) {
    case '-1d':
      range = subDays(currentDate, 1);
      break;
    case '-1w':
      range = subWeeks(currentDate, 1);
      break;
    case '-1m':
      range = subMonths(currentDate, 1);
      break;
    case '-3m':
      range = subMonths(currentDate, 3);
      break;
    case '-6m':
      range = subMonths(currentDate, 6);
      break;
    case '-1y':
      range = subYears(currentDate, 1);
      break;
    case '-3y':
      range = subYears(currentDate, 3);
      break;
    default:
      // default is last year
      range = subYears(currentDate, 1);
  }
  return formatISO(range);
};

const requestDefaults = (options) => {
  gaxios.instance.defaults = {
    agent: httpsAgent,
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(options.accessId + ':' + options.accessKey).toString('base64'),
      'Content-type': 'application/json'
    },
    retry: false
  };
};

const doLookup = async (entities, options, cb) => {
  let lookupResults;

  requestDefaults(options);

  try {
    lookupResults = await async.parallelLimit(
      entities.map((entity) => async () => {
        const lookupResult = await getJobMessages(entity, options);
        return _isMiss(lookupResult)
          ? {
              entity,
              data: null
            }
          : lookupResult;
      }),
      10
    );
  } catch (err) {
    Logger.error(err);
    const handledError = gaxiosErrorToPojo(err);
    Logger.error({ err: handledError }, 'Lookup Error');

    return cb(handledError);
  }

  Logger.trace({ lookupResults }, 'lookupResults');
  return cb(null, lookupResults);
};

const createJob = async (entity, options) => {
  const query = options.query.replace(entityTemplateReplacementRegex, entity.value);
  const endDate = formatISO(new Date());
  const requestOptions = {
    method: 'POST',
    url: `https://api${options.apiDeployment.value}sumologic.com/api/v1/search/jobs`,
    data: {
      query,
      from: getStartDate(options),
      to: endDate,
      timeZone: options.timeZone,
      byReceiptTime: true
    }
  };

  Logger.trace({ requestOptions }, 'Request Options');
  const job = await gaxios.request(requestOptions);
  return job;
};

const getCreatedJobId = async (entity, options) => {
  let result;

  try {
    const job = await createJob(entity, options);
    if (Object.keys(job).length > 0) {
      const getJobResults = async () => {
        // Wait an initial 1000ms before polling for first time
        await sleep(1000);
        result = await gaxios.request({
          method: 'GET',
          url: `https://api${options.apiDeployment.value}sumologic.com/api/v1/search/jobs/${job.data.id}`
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
    }
  } catch (err) {
    Logger.error(err, 'Error in getCreatedJobId');
    throw err;
  }
};

const getJobMessages = async (entity, options) => {
  let results;

  const createdJobId = await getCreatedJobId(entity, options).catch((err) => {
    if (err) {
      Logger.error({ ERR: err });
      throw err;
    }
  });

  if (createdJobId) {
    results = await gaxios.request({
      method: 'GET',
      url: `https://api${options.apiDeployment.value}sumologic.com/api/v1/search/jobs/${createdJobId.jobId}/messages?offset=0&limit=10`
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
  let tags = new Set();

  if (Object.keys(data).length > 0) {
    const totalMessages = data.messages.length;
    tags.add(`Messages: ${totalMessages}`);
  }

  // For a list of built-in metadata fields that can be present see:
  // https://help.sumologic.com/docs/metrics/introduction/built-in-metadata/
  if (Object.keys(data).length > 0) {
    data.messages.forEach((message) => {
      if (message.map._source) {
        tags.add(`Source: ${message.map._source}`);
      } else if (message.map._sourcename) {
        tags.add(`Name: ${message.map._sourcename}`);
      } else if (message.map._sourcecategory) {
        tags.add(`Category: ${message.map._sourcecategory}`);
      }
    });
  }

  tags = [...tags];

  if (tags.length > MAX_TAGS) {
    let length = tags.length;
    tags = tags.slice(0, MAX_TAGS);
    tags.push(`+${length - MAX_TAGS} more`);
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

  validateOption(errors, options, 'accessId', 'You must provide a valid access id.');
  validateOption(errors, options, 'accessKey', 'You must provide a valid access key.');
  validateOption(errors, options, 'timeZone', 'You must provide a valid time zone.');
  validateOption(errors, options, 'query', 'You must provide a valid query.');

  callback(null, errors);
}

const _isMiss = (lookupResult) =>
  !lookupResult ||
  lookupResult.data.details.messages.length <= 0 ||
  lookupResult.data.details.fields.length <= 0;

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
