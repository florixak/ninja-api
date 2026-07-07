import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController();
  });

  describe('getVersionedRoot', () => {
    it('should return API metadata', () => {
      expect(appController.getVersionedRoot()).toEqual({
        name: 'Spinjitzu API',
        version: 'v1',
        docs: '/docs',
        endpoints: [
          '/characters',
          '/seasons',
          '/elements',
          '/weapons',
          '/locations',
          '/realms',
          '/health',
        ],
      });
    });
  });
});
