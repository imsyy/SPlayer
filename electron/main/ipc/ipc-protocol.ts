import { app, ipcMain } from "electron";
import { processLog } from "../logger";

const initProtocolIpc = (): void => {
  ipcMain.on("register-protocol", (_, protocol: string) => {
    app.setAsDefaultProtocolClient(protocol);
    processLog.info("🔗 Registered custom protocol", protocol);
  });

  ipcMain.on("unregister-protocol", (_, protocol: string) => {
    app.removeAsDefaultProtocolClient(protocol);
    processLog.info("🔗 Unregistered custom protocol", protocol);
  });
};

export default initProtocolIpc;
