// @flow
const cluster = require('cluster');

global.IS_DEV_MODE = process.env.NODE_ENV === 'development';

/* eslint-disable no-console, global-require */
global.printError = (error: Error) => {
  console.log('\x1b[31m');
  console.log(`🐛 ${error.message}`);
  console.log('\x1b[37m');
};

global.printSuccess = (mess: string) => {
  console.log(`\x1b[32m${mess}\x1b[37m`);
};

const SERVER_READY_EVENT = 'serverReady';

if (cluster.isMaster) {
  const tools = require('./api/tools');

  const {
    random,
    alphabet,
  } = require('./api/random');

  const appErrorHandler = (error) => {
    printError(error);
    process.exit(1);
  };

  process.on('uncaughtException', appErrorHandler);
  process.on('unhandledRejection', appErrorHandler);

  const notEmptyChecker = (attr: string, val: any): string => {
    const pVal = typeof val === 'string' ? val.trim() : '';

    if (pVal.length === 0) {
      throw new Error(`Attribute "${attr}" is required`);
    }

    return pVal;
  };

  const numChecker = (attr: string, val: any, asInt: boolean = false): number => {
    let pVal = typeof val === 'number' ? val : parseFloat(val);

    if (asInt) {
      pVal = parseInt(pVal, 10);
    }

    if (Number.isNaN(pVal)) {
      throw new Error(`Attribute "${attr}" has to be number type`);
    }

    return pVal;
  };

  const intNumChecker = (attr: string, val: any): number => numChecker(attr, val, true);

  const emailChecker = (attr: string, mbEmail: string): string => {
    if (!tools.emailRegExp.test(mbEmail)) {
      throw new Error(`Attribute "${attr}" has to be email`);
    }

    return mbEmail;
  };

  const urlChecker = (attr: string, mbUrl: string): string => {
    if (!tools.urlRegExp.test(mbUrl)) {
      throw new Error(`Attribute "${attr}" has to be url`);
    }

    return mbUrl;
  };

  const getDataFromAttr = (attr: string, checkers: Function[] = [], defVal: any): any => {
    let val = process.env[attr];

    if (typeof val === 'undefined' && typeof defVal !== 'undefined') {
      const pureDefVal = typeof defVal === 'function' ? defVal() : defVal;
      val = `${pureDefVal}`;
    }

    const checkersLength = checkers.length;
    let rVal = val;
    let i = 0;

    for (; i < checkersLength; i += 1) {
      rVal = checkers[i](attr, val);
    }

    return rVal;
  };

  const localhost = '127.0.0.1';
  const reqCheckers = [
    notEmptyChecker,
  ];

  const options = {};
  options.ROOT_PATH = __dirname;

  // Checking general settings
  options.PORT = getDataFromAttr('PORT', [
    notEmptyChecker,
    intNumChecker,
  ], 3000);

  const defUrl = IS_DEV_MODE ? `localhost:${options.PORT - 1}` : '';

  options.URL = getDataFromAttr('URL', [
    notEmptyChecker,
    urlChecker,
  ], defUrl);

  // Checking salts
  const randomSaltFunc = () => random(alphabet.all, 5);
  const sessionSalt = getDataFromAttr('SESSION_SALT', reqCheckers, randomSaltFunc);
  const csrfSalt = getDataFromAttr('CSRF_SALT', reqCheckers, randomSaltFunc);

  // Checking postman settings
  options.POSTMAN_ADDRESS = getDataFromAttr('POSTMAN_ADDRESS', [
    notEmptyChecker,
    emailChecker,
  ]);

  options.POSTMAN_PASSWORD = getDataFromAttr('POSTMAN_PASSWORD', reqCheckers);

  // Checking mongodb
  options.MONGO_HOST = getDataFromAttr('MONGO_HOST', [
    notEmptyChecker,
    urlChecker,
  ], localhost);

  options.MONGO_PORT = getDataFromAttr('MONGO_PORT', [
    notEmptyChecker,
    intNumChecker,
  ], 27017);

  options.MONGO_DATABASE = getDataFromAttr('MONGO_DATABASE', reqCheckers);

  const mongoUser = getDataFromAttr('MONGO_USER');
  const mongoPassword = getDataFromAttr('MONGO_PASSWORD');

  if (mongoUser || mongoPassword) {
    options.MONGO_AUTH = `${getDataFromAttr('MONGO_USER', reqCheckers)}:${getDataFromAttr('MONGO_PASSWORD', reqCheckers)}@`;
  }

  // Redis
  options.REDIS_HOST = getDataFromAttr('REDIS_HOST', [
    notEmptyChecker,
    urlChecker,
  ], localhost);

  options.REDIS_PORT = getDataFromAttr('REDIS_PORT', [
    notEmptyChecker,
    intNumChecker,
  ], 6379);

  options.REDIS_PASSWORD = getDataFromAttr('REDIS_PASSWORD', [], process.env.REDIS_PASSWORD);

  const os = require('os');
  const readline = require('readline');

  const cpusLength = IS_DEV_MODE ? 1 : os.cpus().length;
  const workersCount = cpusLength > 1 ? cpusLength - 1 : 1;
  options.WORKERS_COUNT = workersCount;
  global.OPTIONS = options;

  const envVars = {
    CSRF_SALT: csrfSalt,
    SESSION_SALT: sessionSalt,
    OPTIONS: JSON.stringify(OPTIONS),
    SHOW_STARTUP_INFO: 1,
  };

  let loadedWorkersLength = 0;
  let showWorkersProgress = () => {};

  const clearLine = () => {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  };

  if (workersCount > 1) {
    showWorkersProgress = () => {
      // eslint-disable-next-line flowtype-errors/show-errors
      const tColumns = parseInt(process.stdout.columns, 10);
      let percCount = Math.floor(tColumns / workersCount);

      if (percCount < 1) {
        percCount = 1;
      }

      const doneWorkersProgress = '='.repeat(percCount * loadedWorkersLength);
      const sub = workersCount - loadedWorkersLength;
      const waitWorkersProgress = ' '.repeat(percCount * sub);
      clearLine();

      process.stdout.write(`[${doneWorkersProgress + waitWorkersProgress}]`);
    };
  }

  const workerIsReady = (readyWorker: Object, message: any) => {
    const action = typeof message === 'string' ? message.trim() : '';

    if (action !== SERVER_READY_EVENT) {
      return;
    }

    loadedWorkersLength += 1;
    showWorkersProgress();

    if (loadedWorkersLength === workersCount) {
      cluster.off('message', workerIsReady);
      clearLine();
      printSuccess(`\n\x1b[1m\x1b[32m[[[ Running on ${OPTIONS.URL} ]]]\x1b[37m\x1b[0m`);

      const workerFail = (function makeWorkerFail() {
        const resetAfterMS = workersCount * 1000;
        let length = 0;

        return (errorCode: number) => {
          length += 1;

          if (length === workersCount) {
            throw new Error(`Worker Error.Code ${errorCode}`);
          }

          setTimeout(() => {
            length = 0;
          }, resetAfterMS);
        };
      }());

      cluster.on('exit', (worker: Object, code: number) => {
        if (!worker.exitedAfterDisconnect) {
          workerFail(code);
          const newWorker = cluster.fork(envVars);

          newWorker.once('online', () => {
            cluster.emit('change', worker, newWorker);
          });
        }
      });
    }
  };

  cluster.on('message', workerIsReady);
  let i = 0;

  for (; i < workersCount; i += 1) {
    cluster.fork(envVars);
    envVars.SHOW_STARTUP_INFO = 0;
  }

  printSuccess('Trying run...\n');
} else {
  const express = require('express');
  const http = require('http');

  // eslint-disable-next-line flowtype-errors/show-errors
  global.OPTIONS = JSON.parse(process.env.OPTIONS);

  require('./config');
  const startupPromise = require('./startup');

  startupPromise.then(() => {
    const app = express();
    const server = http.createServer(app);
    app.disable('x-powered-by');
    app.set('trust proxy', true);
    app.use(require('./routes'));

    if (!IS_DEV_MODE) {
      const publicPath = `${__dirname}/public`;
      const indexPath = `${publicPath}/index.html`;
      app.use(express.static(publicPath));

      app.get('*', (req, res) => {
        res.set('Content-type', 'text/html');
        res.sendFile(indexPath);
      });
    }

    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
      res.status(406).end(err.message);
    });

    server.listen(OPTIONS.PORT, (error) => {
      if (error) {
        printError(error);
        return;
      }

      // eslint-disable-next-line flowtype-errors/show-errors
      process.send(SERVER_READY_EVENT);
    });
  }).catch(printError);
}

/* eslint-enable no-console, global-require */
