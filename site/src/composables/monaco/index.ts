import { isClient } from "@ohmycv/utils";
import type * as Monaco from "monaco-editor";
import { setupMonacoModel, setupMonacoEditor, type MonacoModel } from "./setup";

type MonacoStates = {
  editor: Monaco.editor.IStandaloneCodeEditor;
  markdown: MonacoModel;
  css: MonacoModel;
};

const useMonacoState = () =>
  useState<MonacoStates | undefined>("monacoStates", shallowRef);

export const useMonaco = () => {
  const states = useMonacoState();
  const loading = useState<boolean>("monacoLoading", () => false);

  const setup = async (container?: HTMLElement) => {
    if (!isClient || !container) return;

    loading.value = true;

    try {
      const { editor } = await setupMonacoEditor(container);
      const { data, setData } = useDataStore();

      // Markdown model
      const markdown = await setupMonacoModel("markdown", data.markdown, () =>
        setData("markdown", markdown.get().getValue())
      );

      // CSS model
      const css = await setupMonacoModel("css", data.css, () =>
        setData("css", css.get().getValue())
      );

      states.value = { editor, markdown, css };
    } catch (error) {
      // TODO: use toast to show error
      console.error("Failed to initialize the editor: ", error);
    } finally {
      loading.value = false;
    }
  };

  const dispose = () => {
    states.value?.editor.dispose();
    states.value?.markdown.dispose();
    states.value?.css.dispose();

    states.value = undefined;
    loading.value = false;
  };

  const activateModel = (model: "markdown" | "css") => {
    states.value?.editor.setModel(states.value[model].get());
  };

  const setContent = (model: "markdown" | "css", content: string) => {
    states.value?.[model].get().setValue(content);
  };

  return {
    setup,
    dispose,
    activateModel,
    setContent,
    loading
  };
};
