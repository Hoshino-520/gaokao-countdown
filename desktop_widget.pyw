"""高考倒计时桌面悬浮组件。

启动后会在桌面右上角常驻显示，每秒更新；背景透明，拖动可换位置，
右键菜单或右上角的 × 可退出。
"""

from __future__ import annotations

import datetime as dt
import json
import math
from pathlib import Path
import sys
import tkinter as tk


BASE_DIR = Path(__file__).resolve().parent
CONFIG_FILE = BASE_DIR / "config.json"

DEFAULT_CONFIG = {
    "title": "2027 高考倒计时",
    "target": "2027-06-07 00:00:00",
}

WINDOW_WIDTH = 520
WINDOW_HEIGHT = 160

PANEL_BG = "#f7f9fc"
TRANSPARENT_COLOR = "#010203"

TEXT_DARK = "#1b2534"
TEXT_WHITE = "#ffffff"
TEXT_MUTED = "#66718a"
ACCENT = "#d9252f"

_MUTEX_HANDLE = None


def _ensure_single_instance() -> None:
    global _MUTEX_HANDLE
    if sys.platform != "win32":
        return
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32
        _MUTEX_HANDLE = kernel32.CreateMutexW(
            None, False, "Local\\GaokaoCountdownWidget"
        )
        if _MUTEX_HANDLE and kernel32.GetLastError() == 183:
            sys.exit(0)
    except Exception:
        pass


def load_config() -> dict:
    try:
        with CONFIG_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
            return {**DEFAULT_CONFIG, **data}
    except (OSError, ValueError):
        return dict(DEFAULT_CONFIG)


def parse_target(value: str) -> dt.datetime:
    text = str(value).strip().replace("T", " ")
    return dt.datetime.strptime(text, "%Y-%m-%d %H:%M:%S")


class CountdownWidget:
    def __init__(self) -> None:
        self.config = load_config()
        self.target = parse_target(self.config["target"])

        self.root = tk.Tk()
        self.root.title(self.config["title"])
        self.root.overrideredirect(True)
        self.root.attributes("-topmost", True)
        self.transparent = False
        try:
            self.root.attributes("-transparentcolor", TRANSPARENT_COLOR)
            self.transparent = True
        except tk.TclError:
            pass

        window_bg = TRANSPARENT_COLOR if self.transparent else PANEL_BG
        self.root.configure(bg=window_bg)

        self.canvas = tk.Canvas(
            self.root,
            width=WINDOW_WIDTH,
            height=WINDOW_HEIGHT,
            bg=window_bg,
            highlightthickness=0,
            bd=0,
        )
        self.canvas.pack(fill="both", expand=True)
        self.root.update_idletasks()

        screen_width = self.root.winfo_screenwidth()
        x = max(12, screen_width - WINDOW_WIDTH - 24)
        self.root.geometry(f"{WINDOW_WIDTH}x{WINDOW_HEIGHT}+{x}+60")

        self.menu = tk.Menu(self.root, tearoff=0)
        self.menu.add_command(label="退出倒计时", command=self.root.destroy)

        self.close_id = self.canvas.create_text(
            WINDOW_WIDTH - 30,
            38,
            text="×",
            fill=TEXT_MUTED,
            font=("Segoe UI", 16),
            anchor="center",
        )
        self.accent_id = self.canvas.create_rectangle(
            14, 28, 17, WINDOW_HEIGHT - 28, fill=ACCENT, outline=""
        )
        self.title_id = self.canvas.create_text(
            30,
            38,
            text=self.config["title"],
            anchor="w",
            fill=TEXT_MUTED,
            font=("Microsoft YaHei UI", 12),
        )
        self.days_id = self.canvas.create_text(
            30,
            102,
            text="0 天",
            anchor="w",
            fill=TEXT_WHITE,
            font=("Microsoft YaHei UI", 27, "bold"),
        )
        self.time_id = self.canvas.create_text(
            200,
            102,
            text="00:00:00",
            anchor="w",
            fill=ACCENT,
            font=("Segoe UI", 27, "bold"),
        )
        self.subtitle_id = self.canvas.create_text(
            30,
            WINDOW_HEIGHT - 24,
            text="",
            anchor="w",
            fill=TEXT_MUTED,
            font=("Microsoft YaHei UI", 11),
        )
        self.status_id = self.canvas.create_text(
            WINDOW_WIDTH - 30,
            WINDOW_HEIGHT - 24,
            text="倒计时中",
            anchor="e",
            fill=ACCENT,
            font=("Microsoft YaHei UI", 11, "bold"),
        )

        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<Button-3>", self.show_menu)
        self.root.bind("<Button-3>", self.show_menu)
        self.root.bind("<Escape>", lambda _event: self.root.destroy())

        self.tick()
        self.root.mainloop()

    def on_press(self, event: tk.Event) -> None:
        bbox = self.canvas.bbox(self.close_id)
        if bbox and bbox[0] <= event.x <= bbox[2] and bbox[1] <= event.y <= bbox[3]:
            self.root.destroy()
            return
        self._drag_start = (event.x, event.y)
        self._window_start = (self.root.winfo_x(), self.root.winfo_y())

    def on_drag(self, event: tk.Event) -> None:
        if not hasattr(self, "_drag_start"):
            return
        dx = event.x - self._drag_start[0]
        dy = event.y - self._drag_start[1]
        x = self._window_start[0] + dx
        y = self._window_start[1] + dy
        self.root.geometry(f"+{x}+{y}")

    def show_menu(self, _event: tk.Event) -> None:
        self.menu.tk_popup(self.root.winfo_pointerx(), self.root.winfo_pointery())

    def tick(self) -> None:
        now = dt.datetime.now()
        remaining = self.target - now
        staying = remaining.total_seconds() > 0
        if staying:
            tomorrow = now.replace(hour=0, minute=0, second=0, microsecond=0) + dt.timedelta(days=1)
            cycle_seconds = math.floor((tomorrow - now).total_seconds())
            hours = cycle_seconds // 3600
            minutes = (cycle_seconds % 3600) // 60
            seconds = cycle_seconds % 60
            days = (self.target.replace(
                hour=0, minute=0, second=0, microsecond=0
            ) - now.replace(hour=0, minute=0, second=0, microsecond=0)).days
        else:
            days = hours = minutes = seconds = 0

        self.canvas.itemconfigure(self.days_id, text=f"{days} 天")
        self.canvas.itemconfigure(
            self.time_id,
            text=f"{hours:02d}:{minutes:02d}:{seconds:02d}",
        )
        subtitle = (
            f"距 {self.target.year}年{self.target.month}月{self.target.day}日 "
            f"{self.target.strftime('%H:%M')} 开考"
            if staying
            else f"{self.target.year} 高考已开考"
        )
        self.canvas.itemconfigure(self.subtitle_id, text=subtitle)
        self.canvas.itemconfigure(
            self.status_id,
            text="倒计时中" if staying else "已开考",
        )

        delay_ms = 1000 - now.microsecond // 1000 + 25
        self.root.after(delay_ms, self.tick)


if __name__ == "__main__":
    _ensure_single_instance()
    CountdownWidget()
