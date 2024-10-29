<template>
  <UiTooltipProvider :delay-duration="0">
    <UiTooltip>
      <UiTooltipTrigger as-child>
        <UiButton
          class="gap-x-1.5 w-full h-8 justify-start"
          variant="ghost"
          size="sm"
          @click="exportPDF"
        >
          <span i-mdi:file-pdf text-base />
          {{ $t("toolbar.file.export_pdf.title") }}
        </UiButton>
      </UiTooltipTrigger>
      <UiTooltipContent side="bottom" class="w-54 p-0 rounded border-destructive/60">
        <UiAlert variant="destructive" class="border-none rounded-none">
          <UiAlertTitle>
            {{ $t("toolbar.file.export_pdf.alert.title") }}
            <span class="text-foreground font-normal text-xs">
              (<SharedIssueLink issue="13" />, <SharedIssueLink issue="16" />)
            </span>
          </UiAlertTitle>
          <UiAlertDescription v-html="$t('toolbar.file.export_pdf.alert.content')" />
        </UiAlert>
      </UiTooltipContent>
    </UiTooltip>
  </UiTooltipProvider>

  <UiButton
    class="gap-x-1.5 w-full h-8 justify-start"
    variant="ghost"
    size="sm"
    @click="exportMd"
  >
    <span i-ri:markdown-fill text-base />
    {{ $t("toolbar.file.export_md") }}
  </UiButton>
</template>

<script lang="ts" setup>
import { downloadFile } from "@ohmycv/utils";

const { data } = useDataStore();
const saveName = computed(() => data.resumeName.trim().replace(/\s+/g, "_"));

// Export as PDF
const exportPDF = () => {
  const title = document.title;

  document.title = saveName.value;
  window.print();
  document.title = title;
};

// Export as Markdown
const exportMd = () => {
  downloadFile(`${saveName.value}.md`, data.markdown);
};
</script>
