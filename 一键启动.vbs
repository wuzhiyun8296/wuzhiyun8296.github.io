Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 获取当前路径
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir

' 1. 静默清理端口（耗时操作，等它跑完）
ws.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
ws.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True

' 2. 彻底静默启动 Node 和 VitePress
ws.Run "cmd /c node server.js > server_log.txt 2>&1", 0, False
ws.Run "cmd /c npm run dev > dev_log.txt 2>&1", 0, False

' 3. 秒开本地 Loading 页面
ws.Run "loading.html", 1, False