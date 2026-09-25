/** 跨组件共享的接口/模型数据。 */
import { reactive } from 'vue';
import { api } from './api';

export const store = reactive({
  apis: [],
  models: [],
  loaded: false,
  loadError: '',
});

export async function refresh() {
  try {
    const [apis, models] = await Promise.all([api.listApis(), api.listModels()]);
    store.apis = apis;
    store.models = models;
    store.loaded = true;
    store.loadError = '';
  } catch (e) {
    store.loadError = e.message;
  }
}
