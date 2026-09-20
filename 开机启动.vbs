Option Explicit

Dim fso, shell, projectDir, pythonwPath
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
projectDir = fso.GetParentFolderName(WScript.ScriptFullName)

pythonwPath = "pythonw"
If fso.FileExists("D:\Python\pythonw.exe") Then
    pythonwPath = "D:\Python\pythonw.exe"
End If

shell.Run pythonwPath & " """ & projectDir & "\desktop_widget.pyw""", 1, False
