import { createApp } from "vue";
import App from "@/App.vue";
import router from "@/router";

import { IonicVue } from "@ionic/vue";
import { createI18n } from "vue-i18n";

import { createDatabase } from "@/database";

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
import "./theme/variables.scss";

const i18n = createI18n({
  legacy: false,
  locale: "es",
  fallbackLocale: "es",
  messages: {
    es: {
      pages: {
        home: "Incio",
        search: "Buscar",
        favorites: "Favoritos",
        playlists: "Listas",
      },
      search: {
        placeholder: "Busca en la nube... :)",
        start: "Qué te apetece escuchar?",
      },
      favorites: {
        placeholder: "Busca en tus favoritos... :)"
      },
      spotify: {
        link: "Vincular spotify"
      }
    },
  },
});

const database = createDatabase();
const app = createApp(App).use(IonicVue).use(i18n).use(router);

database.then((db) => {
  app.use(db);
  router.isReady().then(() => {
    app.mount("#app");
  });
});
