import floatingTaskbarLyricWindow from "../windows/floating-taskbar-lyric-window";
import taskbarLyricWindow from "../windows/taskbar-lyric-window";

export type TaskbarLyricMode = "taskbar" | "floating";

class TaskbarLyricManager {
  private mode: TaskbarLyricMode = "taskbar";

  getMode() {
    return this.mode;
  }

  private getActive() {
    return this.mode === "floating" ? floatingTaskbarLyricWindow : taskbarLyricWindow;
  }

  create(mode: TaskbarLyricMode) {
    if (mode !== this.mode) {
      this.close(false);
      this.mode = mode;
    }
    return this.getActive().create();
  }

  close(animate: boolean = true) {
    if (this.mode === "floating") {
      floatingTaskbarLyricWindow.close();
      return;
    }
    taskbarLyricWindow.close(animate);
  }

  setVisibility(shouldShow: boolean) {
    this.getActive().setVisibility(shouldShow);
  }

  updateLayout(animate: boolean = false) {
    if (this.mode === "floating") {
      floatingTaskbarLyricWindow.updateLayout(animate);
      return;
    }
    taskbarLyricWindow.updateLayout(animate);
  }

  setContentWidth(width: number) {
    this.getActive().setContentWidth(width);
  }

  handleFadeDone() {
    this.getActive().handleFadeDone();
  }

  send(channel: string, ...args: unknown[]) {
    this.getActive().send(channel, ...args);
  }

  destroyAll() {
    floatingTaskbarLyricWindow.close();
    floatingTaskbarLyricWindow.destroy();
    taskbarLyricWindow.destroy();
  }
}

export default new TaskbarLyricManager();
