Option Explicit

Dim fso, shell, projectDir, startupDir, shortcutPath, shortcut
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)
startupDir = shell.SpecialFolders("Startup")
shortcutPath = startupDir & "\高考倒计时.lnk"

Set shortcut = shell.CreateShortcut(shortcutPath)
shortcut.TargetPath = projectDir & "\开机启动.vbs"
shortcut.WorkingDirectory = projectDir
shortcut.Description = "高考倒计时"
shortcut.Save

WScript.Echo "已设置开机自启。"
