import { createRouter, createWebHistory } from "@ionic/vue-router";
import { RouteRecordRaw } from "vue-router";
import Home from "@/views/Home.vue";
import Search from "@/views/Search.vue";
import Favorites from "@/views/Favorites.vue";
import Tabs from "@/components/layout/Tabs.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/home",
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
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

export default router;
