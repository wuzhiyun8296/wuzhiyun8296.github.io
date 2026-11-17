Set ws = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 获取当前路径
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)
ws.CurrentDirectory = currentDir

' 1. 检查环境 (依赖包是否存在)
' 这里我们简化判断，通过检测 node_modules 文件夹是否存在来判断环境是否就绪
If Not fso.FolderExists(currentDir & "\node_modules") Then
    ' 如果没有依赖，说明是新环境，调出黑框去安装
    ws.Run "cmd /c start.bat", 1, False
    WScript.Quit
End If

' 2. 检查是否安装了 Node.js (通过尝试运行 node -v)
If ws.Run("cmd /c node -v", 0, True) <> 0 Then
    ' 如果没装 Node，调出黑框去安装
    ws.Run "cmd /c start.bat", 1, False
    WScript.Quit
End If

' ================= 环境完美，开始极速静默启动 =================

' 3. 静默清理端口
ws.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
ws.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True

' 4. 彻底静默启动 Node 和 VitePress (不弹黑框)
ws.Run "cmd /c node server.js > server_log.txt 2>&1", 0, False
ws.Run "cmd /c npm run dev > dev_log.txt 2>&1", 0, False

' 5. 秒开本地 Loading 页面
ws.Run "loading.html", 1, False