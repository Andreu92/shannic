import { createRouter, createWebHistory } from "@ionic/vue-router";
import type { RouteRecordRaw } from "vue-router";
import Tabs from "@/components/layout/Tabs.vue";
import Favorites from "@/views/Favorites.vue";
import Home from "@/views/Home.vue";
import Search from "@/views/Search.vue";
import Settings from "@/views/Settings.vue";

const routes: Array<RouteRecordRaw> = [
	{
		path: "/",
		redirect: "/search",
	},
	{
		path: "/",
		component: Tabs,
		children: [
			{
				path: "",
				redirect: "home",
			},
			{
				path: "home",
				component: Home,
			},
			{
				path: "search",
				component: Search,
			},
			{
				path: "favorites",
				component: Favorites,
			},
			{
				path: "playlists",
				component: Home,
			},
			{
				path: "settings",
				component: Settings,
			},
		],
	},
];

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes,
});

export default router;
