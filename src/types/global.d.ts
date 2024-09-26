import { Howl } from "howler";
import { MessageApi, DialogApi, NotificationApi, LoadingBarApi, ModalApi } from "naive-ui";

declare global {
  interface Window {
    player?: null | Howl;
    // naiveui
    $message: MessageApi;
    $dialog: DialogApi;
    $notification: NotificationApi;
    $loadingBar: LoadingBarApi;
    $modal: ModalApi;
  }
}
