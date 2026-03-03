<script setup lang="ts">
import { IonAlert } from "@ionic/vue";
import { onMounted, reactive } from "vue";
import pack from "../../../package.json";
import { useI18n } from "vue-i18n";
import { InAppBrowser } from "@capgo/inappbrowser";

const { t } = useI18n();

const update: { available: boolean; version: string; url: string } = reactive({
  available: false,
  version: `v${pack.version}`,
  url: import.meta.env.VITE_GITHUB_REPO_URL,
});

const checkForUpdate = () => {
  const last_update_check_date = localStorage.getItem("last_update_check_date");
  if (
    !last_update_check_date ||
    Date.now() - parseInt(last_update_check_date) > 24 * 60 * 60 * 1000
  ) {
    fetch(`${import.meta.env.VITE_GITHUB_API_REPO_URL}/releases/latest`, {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
      .then((res) =>
        res
          .json()
          .then((data) => {
            update.version = data.tag_name;
            const current_version = `v${pack.version}`;

            if (update.version && update.version !== current_version) {
              update.available = true;
              update.url = data.html_url;
            }
          })
          .catch(() => {
            throw new Error("Error parsing check for updates response.");
          }),
      )
      .catch(() => {
        throw new Error("Check for updates failed.");
      })
      .finally(() => {
        localStorage.setItem("last_update_check_date", Date.now().toString());
      });
  }
};

onMounted(() => {
  checkForUpdate();
});
</script>

<template>
  <ion-alert
    :is-open="update.available"
    :header="t('update.title')"
    :message="t('update.message', [update.version])"
    :buttons="[
      {
        text: t('generic.no'),
        role: 'cancel',
        handler: () => {
          update.available = false;
        },
      },
      {
        text: t('generic.yes'),
        role: 'confirm',
        handler: () => {
          InAppBrowser.open({
            url: update.url,
          });
          update.available = false;
        },
      },
    ]"
  ></ion-alert>
</template>
