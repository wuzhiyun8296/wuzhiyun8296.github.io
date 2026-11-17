' 一键启动：真正的启动逻辑在同目录的 start.vbs
' （拆开是因为中文文件名在各平台的下载编码不一致，安装器只下载 ASCII 名）
Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
d = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = d
ws.Run "wscript.exe """ & d & "\start.vbs""", 1, False