import { RedisClient } from '../../redis-client/redis-client.js';
import { Meteor } from 'meteor/meteor';

const redisSettingsKey = 'u_sttngs_';
const setUserAccountsSettingsForCookie = (key, data) => {
  RedisClient.open((error, client) => {
    if (error) {
      RedisClient.quit();
      return;
    }

    client.set(`${redisSettingsKey}${key}`, JSON.stringify(data), () => {
      RedisClient.quit();
    });
  });
};

const getUserAccountsSettingsFromCookie = (key) => {
  const returnData = Promise.await(new Promise((resolve, reject) => {
    RedisClient.open((error, client) => {
      if (error) {
        return reject(error);
      }

      client.get(`${redisSettingsKey}${key}`, (error, response) => {

        if (error) {
          return reject(error);
        }

        try {
          const jsonData = JSON.parse(response);
          return resolve(jsonData);
        } catch(error) {
          return reject(error);
        }
      });
    });
  }).then((data) => {
    return data;
  }).catch((error) => {
    return {};
  }));

  RedisClient.quit();
  return returnData;
};

Meteor.methods({
  userAccountsSetSettingsForCookie(cookieKey, data) {
    setUserAccountsSettingsForCookie(cookieKey, data);
  },

  userAccountsGetSettingsFromCookie(cookieKey) {
    return getUserAccountsSettingsFromCookie(cookieKey);
  }
});
