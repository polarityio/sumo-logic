const gaxios = require('gaxios');
const fs = require('fs');
const https = require('https');
const config = require('./config/config');

const _configFieldIsValid = (field) => typeof field === 'string' && field.length > 0;
let Logger;

function startup(logger) {
  Logger = logger;
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

  gaxios.instance.defaults = {
    agent: httpsAgent,
    headers: {
      Authorization:
      // removed for init commit 
      'Content-type': 'application/json'
    },
    ...(_configFieldIsValid(proxy) && { proxy: { host: proxy } })
  };
}

const doLookup = async (entities, options, cb) => {
  let lookupResults;
  try {
    entities.map(async (entity) => {
      lookupResults = await getJobMessages(entity, options);
      Logger.trace({ FINAL_RESULTS: lookupResults });
    });
  } catch (error) {
    return error;
  }

  Logger.trace({ lookupResults }, 'lookupResults');
  return cb(null, lookupResults);
};

// Create a job
const createJob = async (options) => {
  let result;
  try {
    result = await gaxios.request({
      method: 'POST',
      url: `https://api.us2.sumologic.com/api/v1/search/jobs`,
      data: JSON.stringify({
        query: options.query,
        from: options.from,
        to: options.to,
        timeZone: options.timeZone,
        byReceiptTime: true
      })
    });

    if (result.data.id) {
      return result;
    }
  } catch (err) {
    throw err;
  }
};

const getCreatedJob = async (options) => {
  let result;
  const job = await createJob(options);

  const makeRequest = async () => {
    try {
      result = await gaxios.request({
        method: 'GET',
        url: `https://api.us2.sumologic.com/api/v1/search/jobs/${job.data.id}`
      });

      if (result.data.state === 'DONE GATHERING RESULTS') {
        return {
          data: result,
          jobId: job.data.id
        };
      } else {
        await sleep(1000);
        return makeRequest();
      }
    } catch (err) {
      throw err;
    }
  };
  return makeRequest();
};

const getJobMessages = async (entity, options) => {
  const createdJob = await getCreatedJob(options);

  Logger.trace({ JOB: createdJob });

  try {
    result = await gaxios.request({
      method: 'GET',
      url: `https://api.us2.sumologic.com/api/v1/search/jobs/${createdJob.jobId}/messages?offset=0&limit=10` //make records and messages an optional, same as pagination?
    });
  } catch (err) {
    throw err;
  }

  return {
    entity,
    data: { summary: result.data, details: result.data }
  };
};

const sleep = async (time) =>
  new Promise((res, rej) => {
    setTimeout(() => res(), time);
  });

module.exports = {
  doLookup,
  startup,
  createJob,
  getCreatedJob
};
