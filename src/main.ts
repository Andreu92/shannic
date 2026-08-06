import { IonicVue } from "@ionic/vue";
import { createPinia } from "pinia";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";

import App from "@/App.vue";
import { createDatabase } from "@/database";
import { ar, ca, zh_CN, nl, en, es, fr, de, it, ja, pl, ru, pt_PT } from "@/lang";
import router from "@/router";

/* Core CSS required for Ionic components to work properly */
import "@ionic/vue/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";

import "@ionic/vue/css/palettes/dark.class.css";

/* Theme variables */
import "./theme/styles.scss";

const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages: {
    es: es,
    en: en,
    ca: ca,
    zh_CN: zh_CN,
    ar: ar,
    it: it,
    fr: fr,
    de: de,
    pt_PT: pt_PT,
    ru: ru,
    pl: pl,
    nl: nl,
    ja: ja,
  },
});

const database = createDatabase();
const pinia = createPinia();
const app = createApp(App).use(IonicVue).use(i18n).use(router).use(pinia);

database.then((db) => {
  app.use(db);
  router.isReady().then(() => {
    app.mount("#app");
  });
});
