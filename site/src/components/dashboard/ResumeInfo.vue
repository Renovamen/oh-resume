<template>
  <div class="text-center">
    <SharedUiEditable
      class="w-53 mx-auto"
      :default-value="resume.name"
      submit-mode="enter"
      auto-resize
      @submit="(text) => rename(text)"
    />

    <div text="xs muted-foreground" mt-1.5>
      {{ $t("dashboard.updated") }}{{ formatDate(resume.updated_at) }}
    </div>
    <div text="xs muted-foreground" mt-0.5>
      {{ $t("dashboard.created") }}{{ formatDate(resume.created_at) }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { isInteger } from "@ohmycv/utils";
import type { DbResume } from "~/utils/storage";

const props = defineProps<{
  resume: DbResume;
}>();

const rename = async (text?: string) => {
  if (!text) return;

  await storageService.updateResume(
    {
      id: props.resume.id,
      name: text
    },
    false
  );
};

const formatDate = (date?: string) =>
  date &&
  isInteger(date, { allowString: true }) &&
  new Date(parseInt(date))
    .toISOString()
    .substring(0, 19)
    .replace("T", " ")
    .replaceAll("-", "/");
</script>
