import { ftrackIdSubmodule } from 'modules/ftrackIdSystem.js';
import * as utils from 'src/utils.js';
import { uspDataHandler } from 'src/adapterManager.js';
let expect = require('chai').expect;

let server;

let configMock = {
  name: 'ftrack',
  params: {
    url: 'https://d9.flashtalking.com/d9core'
  },
  storage: {
    name: 'ftrackId',
    type: 'html5',
    expires: 90,
    refreshInSeconds: 8 * 3600
  },
  debug: true
};

let consentDataMock = {
  gdprApplies: 0,
  consentString: '<CONSENT_STRING>'
};

describe('FTRACK ID System', () => {
  describe(`Global Module Rules`, () => {
    it(`should not use the "PREBID_GLOBAL" variable nor otherwise obtain a pointer to the global PBJS object`, () => {
      expect((/PREBID_GLOBAL/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
    });
  });

  describe('ftrackIdSubmodule.isConfigOk():', () => {
    let logWarnStub;
    let logErrorStub;

    beforeEach(() => {
      logWarnStub = sinon.stub(utils, 'logWarn');
      logErrorStub = sinon.stub(utils, 'logError');
    });

    afterEach(() => {
      logWarnStub.restore();
      logErrorStub.restore();
    });

    it(`should be rejected if 'config.storage' property is missing`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.storage;
      delete configMock1.params;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - config.storage required to be set.`);
    });

    it(`should be rejected if 'config.storage.name' property is missing`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.storage.name;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - config.storage required to be set.`);
    });

    it(`should be rejected if 'config.storage.name' is not 'ftrackId'`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      configMock1.storage.name = 'not-ftrack';

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.storage.name recommended to be "ftrackId".`);
    });

    it(`should be rejected if 'congig.storage.type' property is missing`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.storage.type;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logErrorStub.args[0][0]).to.equal(`FTRACK - config.storage required to be set.`);
    });

    it(`should be rejected if 'config.storage.type' is not 'html5'`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      configMock1.storage.type = 'not-html5';

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.storage.type recommended to be "html5".`);
    });

    it(`should be rejected if 'config.params.url' does not exist`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      delete configMock1.params.url;

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.params.url is required for ftrack to run. Url should be "https://d9.flashtalking.com/d9core".`);
    });

    it(`should be rejected if 'storage.param.url' does not exist or is not 'https://d9.flashtalking.com/d9core'`, () => {
      let configMock1 = JSON.parse(JSON.stringify(configMock));
      configMock1.params.url = 'https://d9.NOT.flashtalking.com/d9core';

      ftrackIdSubmodule.isConfigOk(configMock1);
      expect(logWarnStub.args[0][0]).to.equal(`FTRACK - config.params.url is required for ftrack to run. Url should be "https://d9.flashtalking.com/d9core".`);
    });
  });

  describe(`ftrackIdSubmodule.isThereConsent():`, () => {
    let uspDataHandlerStub;
    beforeEach(() => {
      uspDataHandlerStub = sinon.stub(uspDataHandler, 'getConsentData');
    });

    afterEach(() => {
      uspDataHandlerStub.restore();
    });

    describe(`returns 'false' if:`, () => {
      it(`GDPR: if gdprApplies is truthy`, () => {
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: 1})).to.not.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: true})).to.not.be.ok;
      });

      it(`US_PRIVACY version 1: if 'Opt Out Sale' is 'Y'`, () => {
        uspDataHandlerStub.returns('1YYY');
        expect(ftrackIdSubmodule.isThereConsent({})).to.not.be.ok;
      });
    });

    describe(`returns 'true' if`, () => {
      it(`GDPR: if gdprApplies is undefined, false or 0`, () => {
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: 0})).to.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: false})).to.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({gdprApplies: null})).to.be.ok;
        expect(ftrackIdSubmodule.isThereConsent({})).to.be.ok;
      });

      it(`US_PRIVACY version 1: if 'Opt Out Sale' is not 'Y' ('N','-')`, () => {
        uspDataHandlerStub.returns('1NNN');
        expect(ftrackIdSubmodule.isThereConsent(null)).to.be.ok;

        uspDataHandlerStub.returns('1---');
        expect(ftrackIdSubmodule.isThereConsent(null)).to.be.ok;
      });
    });
  });

  describe('getId() method', () => {
    it(`should be using the StorageManager to set cookies or localstorage, as opposed to doing it directly`, () => {
      expect((/localStorage/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
      expect((/cookie/gi).test(JSON.stringify(ftrackIdSubmodule))).to.not.be.ok;
    });

    it(`should be the only method that gets a new ID aka hits the D9 endpoint`, () => {
      let appendChildStub = sinon.stub(window.document.body, 'appendChild');

      ftrackIdSubmodule.getId(configMock, null, null).callback();
      expect(window.document.body.appendChild.called).to.be.ok;
      let actualScriptTag = window.document.body.appendChild.args[0][0];
      expect(actualScriptTag.tagName.toLowerCase()).to.equal('script');
      expect(actualScriptTag.getAttribute('src')).to.equal('https://d9.flashtalking.com/d9core');
      appendChildStub.resetHistory();

      ftrackIdSubmodule.decode('value', configMock);
      expect(window.document.body.appendChild.called).to.not.be.ok;
      expect(window.document.body.appendChild.args).to.deep.equal([]);
      appendChildStub.resetHistory();

      ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}});
      expect(window.document.body.appendChild.called).to.not.be.ok;
      expect(window.document.body.appendChild.args).to.deep.equal([]);

      appendChildStub.restore();
    });

    it(`should populate localstorage and return the IDS (end-to-end test)`, () => {
      let ftrackId,
        ftrackIdExp,
        forceCallback = false;

      // Confirm that our item is not in localStorage yet
      expect(window.localStorage.getItem('ftrack-rtd')).to.not.be.ok;
      expect(window.localStorage.getItem('ftrack-rtd_exp')).to.not.be.ok;

      ftrackIdSubmodule.getId(configMock, consentDataMock, null).callback();
      return new Promise(function(resolve, reject) {
        window.testTimer = function () {
          // Sinon fake server is NOT changing the readyState to 4, so instead
          // we are forcing the callback to run and just passing in the expected Object
          if (!forceCallback && window.hasOwnProperty('D9r')) {
            window.D9r.callback({ 'DeviceID': ['<DEVICE_ID>'], 'SingleDeviceID': ['<SINGLE_DEVICE_ID>'] });
            forceCallback = true;
          }

          ftrackId = window.localStorage.getItem('ftrackId');
          ftrackIdExp = window.localStorage.getItem('ftrackId_exp');

          if (!!ftrackId && !!ftrackIdExp) {
            expect(window.localStorage.getItem('ftrackId')).to.be.ok;
            expect(window.localStorage.getItem('ftrackId_exp')).to.be.ok;
            resolve();
          } else {
            window.setTimeout(window.testTimer, 25);
          }
        };
        window.testTimer();
      });
    });
  });

  describe(`decode() method`, () => {
    it(`should respond with an object with the key 'ftrackId'`, () => {
      expect(ftrackIdSubmodule.decode('value', configMock)).to.deep.equal({ftrackId: 'value'});
    });

    it(`should not be making requests to retrieve a new ID, it should just be decoding a response`, () => {
      server = sinon.createFakeServer();
      ftrackIdSubmodule.decode('value', configMock);

      expect(server.requests).to.have.length(0);

      server.restore();
    })
  });

  describe(`extendId() method`, () => {
    it(`should not be making requests to retrieve a new ID, it should just be adding additional data to the id object`, () => {
      server = sinon.createFakeServer();
      ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}});

      expect(server.requests).to.have.length(0);

      server.restore();
    });

    it(`should return cacheIdObj`, () => {
      expect(ftrackIdSubmodule.extendId(configMock, null, {cache: {id: ''}})).to.deep.equal({cache: {id: ''}});
    });
  });
});
