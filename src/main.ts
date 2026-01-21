import { IonicVue } from "@ionic/vue";
import { createPinia } from "pinia";
import { createApp } from "vue";
import { createI18n } from "vue-i18n";

import App from "@/App.vue";
import { createDatabase } from "@/database";
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
	locale: "es",
	fallbackLocale: "es",
	messages: {
		es: {
			generic: {
				yes: "Sí",
				no: "No",
			},
			pages: {
				home: "Incio",
				search: "Buscar",
				favorites: "Favoritos",
				playlists: "Listas",
			},
			search: {
				placeholder: "Busca en la nube... :)",
				start: "Qué te apetece escuchar?",
				error: "Error al realizar la búsqueda en la nube.",
			},
			favorites: {
				placeholder: "Busca en tus favoritos... :)",
				noResults: "Vaya! Parece que no encuentro nada.",
				start: "Aún no tienes favoritos? :O",
				spotify: "Importar de spotify",
				delete: {
					header: "Eliminar favorito",
					message: "¿Seguro que quieres eliminar {title} de tus favoritos?",
				},
			},
			spotify: {
				link: "Vincular spotify",
			},
		},
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
