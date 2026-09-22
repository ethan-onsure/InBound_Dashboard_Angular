import { environment as localEnvironment } from '../../environments/environment';
import { environment as prodEnvironment } from '../../environments/environment.prod';

const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const APP_CONFIG = {
  apiBaseUrl: isLocalhost ? localEnvironment.apiBaseUrl : prodEnvironment.apiBaseUrl,
};
