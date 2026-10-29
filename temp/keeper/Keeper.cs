// Keeper — 一定間隔で Shift キーを押して、離席・スリープにならないようにする常駐ツール。
// 元の keeper.exe（Python 製・約19MB）と同じ動きを C# で作り直したもの。
// Windows 10/11 に最初から入っている .NET Framework 4.8 で動くため、exe は数十KBで済む。
//
// 追加した機能: 夜間（既定 21:00〜07:00）は停止する。
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace Keeper
{
    static class Program
    {
        // 元のツールと同じ: 60秒ごとに Shift を押す
        const int IntervalSeconds = 60;
        const byte VK_SHIFT = 0x10;
        const uint KEYEVENTF_KEYUP = 0x0002;

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern bool DestroyIcon(IntPtr hIcon);

        // 設定（元のツールと同じく、終了すると初期値に戻る）
        internal static bool Enabled = true;
        internal static bool LunchSkip = false;
        internal static string LunchStart = "12:00";
        internal static string LunchEnd = "13:00";
        internal static bool NightSkip = true;
        internal static string NightStart = "21:00";
        internal static string NightEnd = "07:00";

        static NotifyIcon _tray;
        static SettingsForm _settings;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            var menu = new ContextMenuStrip();
            var openItem = new ToolStripMenuItem("設定を開く", null, (s, e) => OpenSettings());
            openItem.Font = new Font(openItem.Font, FontStyle.Bold);
            menu.Items.Add(openItem);
            menu.Items.Add(new ToolStripMenuItem("有効 / 無効", null, (s, e) => { Enabled = !Enabled; UpdateTray(); }));
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(new ToolStripMenuItem("終了", null, (s, e) => { _tray.Visible = false; Application.Exit(); }));

            _tray = new NotifyIcon { ContextMenuStrip = menu, Visible = true };
            _tray.DoubleClick += (s, e) => OpenSettings();
            UpdateTray();

            var timer = new Timer { Interval = IntervalSeconds * 1000 };
            timer.Tick += (s, e) => Tick();
            timer.Start();
            Tick(); // 元のツールと同じく、起動直後に1回目を実行

            Application.Run();
            _tray.Dispose();
        }

        static void Tick()
        {
            if (Enabled && !IsLunchTime() && !IsNightTime())
            {
                keybd_event(VK_SHIFT, 0, 0, UIntPtr.Zero);
                System.Threading.Thread.Sleep(50);
                keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            }
            UpdateTray(); // 夜間に入った・明けたことを表示に反映する
        }

        static bool IsLunchTime()
        {
            return LunchSkip && InRange(LunchStart, LunchEnd);
        }

        static bool IsNightTime()
        {
            return NightSkip && InRange(NightStart, NightEnd);
        }

        // 開始 <= 今 < 終了。開始の方が遅い（21:00〜07:00 のように日をまたぐ）ときは
        // 「開始以降」または「終了より前」を範囲内とする。時刻が読めなければ範囲外（元のツールと同じ）
        static bool InRange(string start, string end)
        {
            TimeSpan s, e;
            if (!TryParseTime(start, out s) || !TryParseTime(end, out e)) return false;
            var now = DateTime.Now.TimeOfDay;
            if (s <= e) return s <= now && now < e;
            return now >= s || now < e;
        }

        internal static bool TryParseTime(string text, out TimeSpan value)
        {
            value = TimeSpan.Zero;
            var parts = (text ?? "").Trim().Split(':');
            int h, m;
            if (parts.Length != 2 || !int.TryParse(parts[0], out h) || !int.TryParse(parts[1], out m)) return false;
            if (h < 0 || h > 23 || m < 0 || m > 59) return false;
            value = new TimeSpan(h, m, 0);
            return true;
        }

        internal static void UpdateTray()
        {
            string status = !Enabled ? "OFF" : IsNightTime() ? "ON・夜間は停止中" : IsLunchTime() ? "ON・昼休みは停止中" : "ON";
            _tray.Text = "Keeper [" + status + "]";

            var old = _tray.Icon;
            _tray.Icon = MakeIcon(Enabled);
            if (old != null) { DestroyIcon(old.Handle); old.Dispose(); }
        }

        // 元のツールと同じ絵: 緑（無効なら灰色）の丸に白い縦線
        static Icon MakeIcon(bool active)
        {
            using (var bmp = new Bitmap(64, 64))
            using (var g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.Clear(Color.Transparent);
                var color = active ? Color.FromArgb(34, 139, 34) : Color.FromArgb(150, 150, 150);
                using (var brush = new SolidBrush(color)) g.FillEllipse(brush, 8, 4, 48, 56);
                using (var pen = new Pen(Color.FromArgb(180, 255, 255, 255), 2)) g.DrawLine(pen, 32, 4, 32, 32);
                return Icon.FromHandle(bmp.GetHicon());
            }
        }

        static void OpenSettings()
        {
            if (_settings != null && !_settings.IsDisposed)
            {
                _settings.Activate();
                return;
            }
            _settings = new SettingsForm();
            _settings.Show();
        }
    }

    class SettingsForm : Form
    {
        public SettingsForm()
        {
            Text = "Keeper 設定";
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            MinimizeBox = false;
            TopMost = true;
            StartPosition = FormStartPosition.CenterScreen;
            AutoScaleMode = AutoScaleMode.Font;
            AutoSize = true;
            AutoSizeMode = AutoSizeMode.GrowAndShrink;
            Padding = new Padding(8);

            var root = new FlowLayoutPanel { FlowDirection = FlowDirection.TopDown, AutoSize = true, WrapContents = false };
            Controls.Add(root);

            // 動作
            var enabledBox = new CheckBox { Text = "有効にする", Checked = Program.Enabled, AutoSize = true };
            enabledBox.CheckedChanged += (s, e) => { Program.Enabled = enabledBox.Checked; Program.UpdateTray(); };
            root.Controls.Add(Group("動作", enabledBox));

            // 昼休み・夜間（チェックはすぐ反映、時刻は「保存して閉じる」で反映。元のツールと同じ）
            TextBox lunchStart, lunchEnd, nightStart, nightEnd;
            root.Controls.Add(TimeGroup("昼休み中は停止する", "昼休み中は停止", Program.LunchSkip,
                v => Program.LunchSkip = v, Program.LunchStart, Program.LunchEnd, "（例: 12:00）", out lunchStart, out lunchEnd));
            root.Controls.Add(TimeGroup("夜間は停止する", "夜間は停止", Program.NightSkip,
                v => Program.NightSkip = v, Program.NightStart, Program.NightEnd, "（例: 21:00 〜 07:00。日をまたいでもよい）", out nightStart, out nightEnd));

            var save = new Button { Text = "保存して閉じる", AutoSize = true, Anchor = AnchorStyles.None };
            save.Click += (s, e) =>
            {
                TimeSpan t;
                foreach (var box in new[] { lunchStart, lunchEnd, nightStart, nightEnd })
                {
                    if (box.Enabled && !Program.TryParseTime(box.Text, out t))
                    {
                        MessageBox.Show(this, "時刻は 12:00 のように「時:分」で入力してください。", "Keeper 設定",
                            MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        box.Focus();
                        return;
                    }
                }
                Program.LunchStart = lunchStart.Text.Trim();
                Program.LunchEnd = lunchEnd.Text.Trim();
                Program.NightStart = nightStart.Text.Trim();
                Program.NightEnd = nightEnd.Text.Trim();
                Program.UpdateTray();
                Close();
            };
            root.Controls.Add(save);
            AcceptButton = save;
        }

        static GroupBox Group(string title, Control content)
        {
            var g = new GroupBox { Text = title, AutoSize = true, AutoSizeMode = AutoSizeMode.GrowAndShrink, Padding = new Padding(8), MinimumSize = new Size(300, 0) };
            content.Dock = DockStyle.Top;
            g.Controls.Add(content);
            return g;
        }

        static GroupBox TimeGroup(string title, string checkText, bool initial, Action<bool> setSkip,
            string start, string end, string example, out TextBox startBox, out TextBox endBox)
        {
            var panel = new TableLayoutPanel { ColumnCount = 4, AutoSize = true };
            var check = new CheckBox { Text = checkText, Checked = initial, AutoSize = true };
            var sBox = new TextBox { Text = start, Width = 60, Enabled = initial };
            var eBox = new TextBox { Text = end, Width = 60, Enabled = initial };
            check.CheckedChanged += (s, e) =>
            {
                setSkip(check.Checked);
                sBox.Enabled = eBox.Enabled = check.Checked;
                Program.UpdateTray();
            };
            panel.Controls.Add(check, 0, 0);
            panel.SetColumnSpan(check, 4);
            panel.Controls.Add(new Label { Text = "開始", AutoSize = true, Anchor = AnchorStyles.Left }, 0, 1);
            panel.Controls.Add(sBox, 1, 1);
            panel.Controls.Add(new Label { Text = "終了", AutoSize = true, Anchor = AnchorStyles.Left }, 2, 1);
            panel.Controls.Add(eBox, 3, 1);
            var hint = new Label { Text = example, ForeColor = Color.Gray, AutoSize = true };
            panel.Controls.Add(hint, 0, 2);
            panel.SetColumnSpan(hint, 4);
            startBox = sBox;
            endBox = eBox;
            return Group(title, panel);
        }
    }
}
