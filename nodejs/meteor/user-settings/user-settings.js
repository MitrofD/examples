import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { ReactiveVar } from 'meteor/reactive-var';
import { Match } from 'meteor/check';
import { Cookie } from 'meteor/chuangbo:cookie';
import { Random } from 'meteor/random';

export const UserSettings = (function() {
  const errorTitle = 'User settings API';
  const updateFuncName = 'userAccountsSetSettingsForCookie';
  let isInit = false;
  let initCallbacks = {};
  const nonReactiveData = {};
  const reactiveData = {};
  const allowedSettings = {
    assetOption: {},
    assetType: {},

    inactiveAssetTypes: {
      default: [],
      actions: {
        toggle(assetName) {
          const assets = this.get(false);
          const assetIndex = assets.indexOf(assetName);
          assetIndex === -1 ? assets.push(assetName) : assets.splice(assetIndex, 1);
          this.set(assets);
        }
      }
    },

    chartType: {
	    default: 'candlestick'
    },

    chartTimePeriod: {
	    default: '1m'
    },

    currentLanguage: {
	    default: 'en'
    },

    hiddenLeftPanel: {
      default: false,
      actions: {
        turnOn() {
          this.set(false);
        },

        turnOff() {
          this.set(true);
        },

        toggle() {
          const oldValue = !!this.get(false);
          this.set(!oldValue);
        }
      }
    },

    muted: {
      default: false,
      actions: {
        turnOn() {
          this.set(true);
        },

        turnOff() {
          this.set(false);
        },

        toggle() {
          const oldValue = !!this.get(false);
          this.set(!oldValue);
        }
      }
    },

    favoriteAssets: {
      default: [],
      actions: {
        toggle(assetName) {
          const assets = this.get(false);
          const assetIndex = assets.indexOf(assetName);
          assetIndex === -1 ? assets.push(assetName) : assets.splice(assetIndex, 1);
          this.set(assets);
        }
      }
    },

    proMode: {
      default: false,
      actions: {
        enabled() {
          this.set(true);
        },

        disabled() {
          this.set(false);
        },

        toggle() {
          const oldValue = !!this.get(false);
          this.set(!oldValue);
        }
      }
    },

    TRSelectedAsset: {},
    CFDSelectedAsset: {},
    ForexSelectedAsset: {}
  };

  const cookieValueKey = 'userSettingsCookieKey';
  let cookieKey = Cookie.get(cookieValueKey);

  if (!cookieKey) {
    cookieKey = Random.id();
    Cookie.set(cookieValueKey, cookieKey, {
      expires: 365
    });
  }

  const retObj = {
    id: cookieKey,
    didInit(key, callback) {

      if (typeof key !== 'string') {
        throw new Meteor.Error(errorTitle, 'Parameter "key" must have "String" type');
      }

      key = key.trim();

      if (!key.length) {
        throw new Meteor.Error(errorTitle, 'Parameter "key" is required');
      }

      if (!isFunction(callback)) {
        throw new Meteor.Error(errorTitle, 'Parameter "callback" must have "function" type');
      }

      if (isInit) {
        callback(nonReactiveData);
      } else {
        initCallbacks[key] = callback;
      }
    }
  };

  Meteor.call('userAccountsGetSettingsFromCookie', cookieKey, (error, settings) => {
    isInit = true;
    const settingsData = isObject(settings) ? settings : {};

    for (const property in allowedSettings) {
      const settingItem = allowedSettings[property];
      const defaultData = has.call(settingsData, property) ? settingsData[property] : settingItem.default;
      nonReactiveData[property] = defaultData;
      reactiveData[property] = new ReactiveVar(defaultData);

      const option = {
        get(asReactive = true) {
          return !!asReactive ? reactiveData[property].get() : nonReactiveData[property];
        },

        set(newValue) {
          const finishSet = () => {
            nonReactiveData[property] = newValue;
            reactiveData[property].set(newValue);
            Meteor.call(updateFuncName, cookieKey, nonReactiveData);
          };

          if (settingItem.check) {
            Match.test(newValue, settingItem.check) && finishSet();
          } else {
            finishSet();
          }
        }
      };

      if (isObject(settingItem.actions)) {

        for (const actionName in settingItem.actions) {
          option[actionName] = (...args) => {
            settingItem.actions[actionName].apply(option, args);
          };
        }
      }

      retObj[property] = option;
    }

    for (const key in initCallbacks) {
      const initCallback = initCallbacks[key];
      initCallback(nonReactiveData);
    }

    initCallbacks = {};
  });

  return retObj;
}());

Meteor.userSettings = UserSettings;
